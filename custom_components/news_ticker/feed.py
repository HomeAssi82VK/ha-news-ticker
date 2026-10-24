"""Safe RSS 2.0 / RDF / Atom parsing for News Ticker.

Only simple strings are returned to the browser; no HTML from feeds is executed.
"""
from __future__ import annotations

from datetime import datetime
from email.utils import parsedate_to_datetime
import html
import logging
import re
from urllib.parse import urljoin, urlsplit

from defusedxml import ElementTree as ET
from defusedxml.common import DefusedXmlException

MAX_ENTRIES = 40
_LOGGER = logging.getLogger(__name__)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _child(node, name: str):
    return next((child for child in node if _local(child.tag) == name), None)


def _text(node, name: str) -> str:
    child = _child(node, name)
    return "" if child is None else "".join(child.itertext()).strip()


def _clean(text: str, limit: int = 500) -> str:
    text = html.unescape(re.sub(r"<[^>]*>", "", text or ""))
    return " ".join(text.split())[:limit]


def _timestamp(date: str) -> float:
    if not date:
        return 0.0
    try:
        return parsedate_to_datetime(date).timestamp()
    except (ValueError, TypeError, OverflowError, IndexError):
        pass
    try:
        return datetime.fromisoformat(date.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, OverflowError):
        return 0.0


def _safe_link(link: str, base_url: str) -> str:
    if not link:
        return ""
    full = urljoin(base_url, link.strip())
    parts = urlsplit(full)
    if parts.scheme.lower() not in ("http", "https") or not parts.hostname:
        return ""
    if parts.username is not None or parts.password is not None:
        return ""
    return full[:2048]


def describe_response(data: bytes, status: int, content_type: str) -> str:
    """Compact, safe diagnostics for an unexpected feed response."""
    preview = data[:90].decode("utf-8", errors="replace")
    preview = re.sub(r"[\x00-\x1f\x7f]+", " ", preview)
    preview = " ".join(preview.split())
    preview = preview[:65]
    short_type = content_type.split(";", 1)[0].strip() or "unbekannter Inhaltstyp"
    if preview.lower().startswith(("<!doctype html", "<html", "<head")) or "text/html" in short_type.lower():
        return f"HTTP {status}, {short_type}: HTML statt RSS (Anfang: {preview})"
    return f"HTTP {status}, {short_type}, Anfang: {preview or '(leer)'}"


def _parse_root(root, base_url: str) -> list[dict]:
    """Read entries from an already validated RSS/RDF/Atom XML root."""
    root_name = _local(root.tag)
    if root_name == "feed":
        entries = [node for node in root if _local(node.tag) == "entry"]
        atom = True
    elif root_name in ("rss", "rdf"):
        parent = _child(root, "channel")
        if parent is None:
            parent = root
        entries = [node for node in parent if _local(node.tag) == "item"]
        if not entries and parent is not root:
            entries = [node for node in root if _local(node.tag) == "item"]
        atom = False
    else:
        raise ValueError("Antwort ist kein gültiger RSS-/Atom-XML-Feed")

    result = []
    for item in entries[:MAX_ENTRIES]:
        title = _clean(_text(item, "title"))
        if not title:
            continue
        if atom:
            link = ""
            for child in item:
                if _local(child.tag) != "link":
                    continue
                if child.get("rel", "alternate") == "alternate":
                    link = child.get("href", "") or (child.text or "")
                    break
            date = _text(item, "published") or _text(item, "updated")
        else:
            link = _text(item, "link")
            date = _text(item, "pubdate") or _text(item, "date")
        result.append({
            "title": title,
            "link": _safe_link(link, base_url),
            "timestamp": _timestamp(date),
        })
    return result


def _salvage_entries(data: bytes, base_url: str) -> list[dict]:
    """Recover independent, well-formed items if a feed has broken CDATA.

    In particular, do not try to close an open CDATA section by guessing where
    it should end. Parse only complete independent XML items using defusedxml.
    """
    header = data[:8192]
    match = re.match(
        rb"\s*(?:<\?xml[^>]*\?>\s*)?<(rss\b|feed\b|[\w.-]+:RDF\b)",
        header, re.IGNORECASE,
    )
    if not match or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        return []

    atom = match.group(1).lower() == b"feed"
    # XML namespaces normally belong to the root and are not repeated on each
    # item. Transfer those declarations to the isolated parse wrapper.
    tags = re.findall(
        rb"<(?:rss|feed|[\w.-]+:RDF|channel)\b[^>]{0,4096}>",
        header, re.IGNORECASE,
    )
    declarations = []
    seen = set()
    for tag in tags[:3]:
        for attr in re.finditer(
            rb"\s+(xmlns(?::[A-Za-z_][A-Za-z0-9_.-]*)?)\s*=\s*([\"'])([^\"'<>]{0,2048})\2",
            tag,
        ):
            name = attr.group(1)
            if name in seen:
                continue
            seen.add(name)
            declarations.append(b" " + name + b"=" + attr.group(2) + attr.group(3) + attr.group(2))
    root_attrs = b"".join(declarations)
    if atom:
        before, after = b"<feed" + root_attrs + b">", b"</feed>"
        pattern = rb"<entry\b[^>]*>.*?</entry\s*>"
    else:
        before, after = b"<rss" + root_attrs + b"><channel>", b"</channel></rss>"
        pattern = rb"<item\b[^>]*>.*?</item\s*>"

    results = []
    for ix, entry in enumerate(re.finditer(pattern, data, re.DOTALL | re.IGNORECASE)):
        if ix >= 200 or len(results) >= MAX_ENTRIES:
            break
        fragment = entry.group(0)
        if len(fragment) > 262144:
            continue
        try:
            root = ET.fromstring(before + fragment + after)
            results.extend(_parse_root(root, base_url))
        except (ET.ParseError, DefusedXmlException, ValueError):
            # One bad item must not suppress the good items before/after it.
            continue
    return results[:MAX_ENTRIES]


def parse_feed(data: bytes, base_url: str) -> list[dict]:
    """Parse RSS/RDF/Atom, recovering well-formed items from broken feeds."""
    try:
        return _parse_root(ET.fromstring(data), base_url)
    except ET.ParseError as err:
        recovered = _salvage_entries(data, base_url)
        if recovered:
            _LOGGER.warning(
                "News Ticker: RSS-Feed %s hat fehlerhaftes XML (%s); "
                "%d gültige Einträge wurden gerettet.",
                base_url, str(err)[:120], len(recovered),
            )
            return recovered
        raise ValueError(
            f"Antwort ist kein gültiger RSS-/Atom-XML-Feed "
            f"({type(err).__name__}: {str(err)[:65]})"
        ) from err
    except DefusedXmlException as err:
        # Do not attempt recovery when the secure parser rejects a dangerous
        # XML construct (DTD/entity expansion, etc.).
        raise ValueError(
            f"Unsicherer XML-Inhalt wurde abgewiesen ({type(err).__name__})"
        ) from err
