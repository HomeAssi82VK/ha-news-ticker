"""Parsing regression tests; pytest and defusedxml suffice (HA not required)."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

MODULE_FILE = Path(__file__).resolve().parents[1] / "custom_components/news_ticker/feed.py"
spec = spec_from_file_location("ntfeed", MODULE_FILE)
module = module_from_spec(spec)
spec.loader.exec_module(module)
parse_feed = module.parse_feed


def test_rss_parsing_and_dates():
    data = b'''<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>A &amp; B</title><link>https://example.org/a</link><pubDate>Sat, 24 Oct 2026 11:00:00 GMT</pubDate></item>
      <item><title><![CDATA[<b>Hallo</b> Welt]]></title><link>/news/2</link></item>
    </channel></rss>'''
    items = parse_feed(data, "https://example.org/rss")
    assert len(items) == 2
    assert items[0]["title"] == "A & B"
    assert items[0]["timestamp"] > 0
    assert items[1]["title"] == "Hallo Welt"
    assert items[1]["link"] == "https://example.org/news/2"


def test_atom_namespace():
    data = b'''<feed xmlns="http://www.w3.org/2005/Atom">
       <entry><title>Neue Technik</title><link rel="alternate" href="https://heise.de/1"/>
       <updated>2026-10-24T10:00:00Z</updated></entry>
       </feed>'''
    items = parse_feed(data, "https://heise.de/feed")
    assert items[0]["title"] == "Neue Technik"
    assert items[0]["link"] == "https://heise.de/1"
    assert items[0]["timestamp"] > 0


def test_malicious_link_is_ignored():
    data = b'<rss><channel><item><title>T</title><link>javascript:alert(1)</link></item></channel></rss>'
    assert parse_feed(data, "https://example.org/")[0]["link"] == ""


def test_invalid_and_entity_xml():
    import pytest
    with pytest.raises(Exception):
        parse_feed(b"not xml", "https://example.org")
    with pytest.raises(Exception):
        parse_feed(b'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss>&x;</rss>', "https://example.org")


def test_rdf_rss():
    data = b'<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><item><title>Eintrag</title><link>https://example.org/</link></item></rdf:RDF>'
    assert parse_feed(data, "https://example.org")[0]["title"] == "Eintrag"


def test_public_url_validator_blocks_local_addresses():
    """Isolate the validator without importing a whole Home Assistant runtime."""
    import ast
    import ipaddress
    from urllib.parse import urlsplit
    import pytest
    source = (MODULE_FILE.parent / "__init__.py").read_text()
    func = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == "validate_public_url")
    mod = ast.Module(body=[func], type_ignores=[])
    context = {"ipaddress": ipaddress, "urlsplit": urlsplit}
    exec(compile(ast.fix_missing_locations(mod), "validator", "exec"), context)
    check = context["validate_public_url"]
    assert check("https://example.org/rss") == "https://example.org/rss"
    for value in [
        "http://127.0.0.1:8123/config", "http://192.168.178.1/rss",
        "https://localhost/rss", "http://169.254.1.1/test",
        "http://10.20.1.2/rss", "ftp://example.com/rss",
        "https://user:pass@example.com/rss", "http://example.org:8888/rss",
        "http://host.local/rss", "https://[::1]/feed", "https://[fe80::1]/x",
    ]:
        with pytest.raises(ValueError):
            check(value)


def test_html_response_reports_readable_error():
    import pytest
    with pytest.raises(ValueError, match="kein gültiger RSS-/Atom-XML-Feed"):
        parse_feed(b"<html><body>Feed not found</body></html>", "https://example.org/rss")

def test_malformed_xml_reports_readable_error():
    import pytest
    with pytest.raises(ValueError, match="kein gültiger RSS-/Atom-XML-Feed"):
        parse_feed(b"<rss><channel><item></rss>", "https://example.org/rss")


def test_diagnostics_for_html_and_xml_response():
    from importlib.util import module_from_spec, spec_from_file_location
    spec = spec_from_file_location("ntfeeddiagnostics", MODULE_FILE)
    m = module_from_spec(spec)
    spec.loader.exec_module(m)
    html = m.describe_response(b"<!DOCTYPE html>\n<html><title>Blocked</title></html>", 200, "text/html; charset=UTF-8")
    assert "HTTP 200" in html and "HTML statt RSS" in html
    xml = m.describe_response(b"<rss><channel><item>", 200, "application/xml")
    assert "application/xml" in xml and "<rss>" in xml


def test_recover_valid_items_around_unclosed_cdata():
    import logging
    raw = (b'<?xml version="1.0"?><rss version="2.0"><channel>'
           b'<item><title>Erste Schlagzeile</title><link>https://example.org/1</link></item>'
           b'<item><title><![CDATA[defekt</title><link>https://example.org/2</link></item>'
           b'<item><title>Letzte Schlagzeile</title><link>https://example.org/3</link></item>'
           b'</channel></rss>')
    items = parse_feed(raw, "https://example.org/rss")
    assert [x["title"] for x in items] == ["Erste Schlagzeile", "Letzte Schlagzeile"]


def test_recover_namespaced_rss_items():
    raw = (b'<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel>'
           b'<item><title>Funktioniert</title><link>/1</link>'
           b'<media:content url="https://example.org/1.jpg" /></item>'
           b'<item><title><![CDATA[KAPUTT</title></item>'
           b'</channel></rss>')
    items = parse_feed(raw, "https://example.org/news")
    assert [x["title"] for x in items] == ["Funktioniert"]
    assert items[0]["link"] == "https://example.org/1"


def test_recover_atom_entries_with_default_namespace():
    raw = (b'<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">'
           b'<entry><title>Erfolg</title><link href="https://example.org/a"/></entry>'
           b'<entry><title><![CDATA[Defekt</title></entry>'
           b'</feed>')
    items = parse_feed(raw, "https://example.org/atom")
    assert len(items) == 1
    assert items[0]["title"] == "Erfolg"


def test_no_recovery_from_html_or_doctype():
    import pytest
    html = b'<html><body><item><title>Fake</title></item></body></html>'
    with pytest.raises(ValueError):
        parse_feed(html, "https://example.org/rss")
    dangerous = (b'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>'
                 b'<rss><channel><item><title>Good</title></item></channel><wrong></rss>')
    with pytest.raises(ValueError):
        parse_feed(dangerous, "https://example.org/rss")
