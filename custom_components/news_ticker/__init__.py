"""News Ticker: cached, public-internet RSS/Atom feeds for Lovelace."""
from __future__ import annotations

import asyncio
import ipaddress
import logging
from pathlib import Path
import socket
import time
from urllib.parse import urljoin, urlsplit

import aiohttp
import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, FRONTEND_URL
from .feed import parse_feed, describe_response

_LOGGER = logging.getLogger(__name__)
MAX_FEEDS = 8
MAX_BYTES = 1_500_000
CACHE_SECONDS_MIN = 120
CACHE_SECONDS_MAX = 3600


def validate_public_url(url: str) -> str:
    """Check URL structure and block local hostnames/IP literals.

    PublicResolver also validates the *actual* DNS answers used by TCP.
    """
    url = url.strip()
    if len(url) > 2048:
        raise ValueError("RSS-URL zu lang")
    try:
        parsed = urlsplit(url)
        port = parsed.port
        hostname = parsed.hostname
    except ValueError as err:
        raise ValueError("Ungültige RSS-Adresse") from err
    if parsed.scheme.lower() not in ("http", "https") or not hostname:
        raise ValueError("Nur vollständige HTTP(S)-URLs werden unterstützt")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("RSS-Adressen mit Zugangsdaten sind nicht erlaubt")
    if port is not None and port not in (80, 443):
        raise ValueError("Nur Standard-Ports 80 und 443 sind erlaubt")
    host = hostname.lower().rstrip(".")
    if host in ("localhost", "localhost.localdomain") or host.endswith(
        (".local", ".lan", ".internal", ".home.arpa", ".localhost")
    ):
        raise ValueError("Lokale Netzwerkadressen sind nicht erlaubt")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not ip.is_global:
            raise ValueError("Private oder reservierte IP-Adressen sind nicht erlaubt")
    return url


class PublicResolver(aiohttp.DefaultResolver):
    """Reject private, loopback, link-local and reserved DNS results."""

    async def resolve(self, host: str, port: int = 0, family: int = socket.AF_INET):
        records = await super().resolve(host, port, family)
        safe = []
        for record in records:
            try:
                if ipaddress.ip_address(record["host"]).is_global:
                    safe.append(record)
            except ValueError:
                continue
        if not safe:
            raise OSError("DNS-Adresse zeigt auf ein privates oder reserviertes Netz")
        return safe


class FeedFetcher:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.session = aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(
                resolver=PublicResolver(), use_dns_cache=False, limit=8
            ),
            timeout=aiohttp.ClientTimeout(total=17),
            headers={"User-Agent": "HomeAssistant-NewsTicker/1.0 (+RSS Reader)",
                     "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},
            trust_env=False,
        )
        self.cache: dict[str, tuple[float, list[dict]]] = {}
        self.locks: dict[str, asyncio.Lock] = {}

    async def close(self) -> None:
        await self.session.close()

    async def _download(self, url: str) -> tuple[bytes, int, str]:
        current = validate_public_url(url)
        for _ in range(5):
            async with self.session.get(current, allow_redirects=False) as response:
                if response.status in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    if not location:
                        raise ValueError("Weiterleitung ohne Ziel")
                    current = validate_public_url(urljoin(current, location))
                    continue
                response.raise_for_status()
                data = await response.content.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise ValueError("RSS-Feed ist zu groß (maximal 1,5 MB)")
                return data, response.status, response.headers.get("Content-Type", "")
        raise ValueError("Zu viele HTTP-Weiterleitungen")

    async def get(self, url: str, ttl: int) -> list[dict]:
        url = validate_public_url(url)
        now = time.monotonic()
        cached = self.cache.get(url)
        if cached and (now - cached[0]) < ttl:
            return cached[1]
        lock = self.locks.setdefault(url, asyncio.Lock())
        async with lock:
            now = time.monotonic()
            cached = self.cache.get(url)
            if cached and (now - cached[0]) < ttl:
                return cached[1]
            try:
                raw, status, content_type = await self._download(url)
                try:
                    parsed = await self.hass.async_add_executor_job(parse_feed, raw, url)
                except ValueError as parse_err:
                    diagnostics = describe_response(raw, status, content_type)
                    _LOGGER.warning("News Ticker RSS feed %s: %s; %s", url, parse_err, diagnostics)
                    raise ValueError(f"{parse_err}; {diagnostics}") from parse_err
                self.cache[url] = (time.monotonic(), parsed)
                # Keep at most 128 distinct cached feeds to limit memory use.
                if len(self.cache) > 128:
                    oldest = min(self.cache, key=lambda key: self.cache[key][0])
                    self.cache.pop(oldest, None)
                    self.locks.pop(oldest, None)
                return parsed
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError, ValueError) as err:
                if cached:
                    _LOGGER.debug("RSS feed %s failed, returning last cached data: %s", url, err)
                    return cached[1]
                raise ValueError(str(err)) from err


@websocket_api.websocket_command(
    {
        vol.Required("type"): "news_ticker/fetch",
        vol.Required("feeds"): vol.All(
            [vol.All(str, vol.Length(min=1, max=2048))], vol.Length(max=MAX_FEEDS)
        ),
        vol.Optional("cache_seconds", default=600): vol.All(
            vol.Coerce(int), vol.Range(min=CACHE_SECONDS_MIN, max=CACHE_SECONDS_MAX)
        ),
    }
)
@websocket_api.async_response
async def ws_fetch(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Return feed headlines with per-source error reporting."""
    fetcher: FeedFetcher | None = hass.data.get(DOMAIN)
    if fetcher is None:
        connection.send_error(msg["id"], "not_ready", "News Ticker ist nicht aktiviert")
        return

    async def one(url: str) -> dict:
        try:
            entries = await fetcher.get(url, msg["cache_seconds"])
            return {"url": url, "items": entries, "error": ""}
        except (ValueError, OSError, aiohttp.ClientError, asyncio.TimeoutError) as err:
            return {"url": url, "items": [], "error": (str(err) or type(err).__name__)[:300]}
        except Exception as err:
            # A single malformed/unusual feed must not break the entire WS request.
            _LOGGER.exception("Unexpected error reading News Ticker feed %s", url)
            return {
                "url": url,
                "items": [],
                "error": f"Interner RSS-Fehler ({type(err).__name__}). Details im Home-Assistant-Protokoll.",
            }

    result = await asyncio.gather(*(one(url) for url in msg["feeds"]))
    connection.send_result(msg["id"], {"feeds": result})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Enable the RSS endpoint and serve the frontend JS file."""
    if DOMAIN in hass.data:
        return True
    frontend_path = Path(__file__).parent / "frontend" / "news-ticker-card.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(frontend_path), False)]
    )
    hass.data[DOMAIN] = FeedFetcher(hass)
    websocket_api.async_register_command(hass, ws_fetch)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Close network resources. Static path and WS command remain until restart."""
    fetcher = hass.data.pop(DOMAIN, None)
    if fetcher:
        await fetcher.close()
    return True
