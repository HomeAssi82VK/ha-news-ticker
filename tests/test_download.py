"""Tests for the production downloader, isolated from Home Assistant imports.

Extract the actual FeedFetcher._download AST rather than duplicating the
implementation under test. No network access or Home Assistant install needed.
"""
from __future__ import annotations

import ast
import asyncio
from pathlib import Path
from urllib.parse import urljoin

import pytest

MAX_BYTES = 1_500_000
SOURCE = Path(__file__).resolve().parents[1] / "custom_components/news_ticker/__init__.py"


def _load_production_download():
    module = ast.parse(SOURCE.read_text(encoding="utf-8"))
    cls = next(node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "FeedFetcher")
    method = next(node for node in cls.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "_download")
    ns = {"MAX_BYTES": MAX_BYTES, "validate_public_url": lambda url: url, "urljoin": urljoin}
    exec(compile(ast.fix_missing_locations(ast.Module(body=[method], type_ignores=[])), str(SOURCE), "exec"), ns)
    return ns["_download"]


class FakeContent:
    def __init__(self, chunks):
        self.chunks = chunks
        self.yielded = 0
        self.requested_chunk_size = None

    async def iter_chunked(self, n):
        self.requested_chunk_size = n
        for chunk in self.chunks:
            self.yielded += 1
            yield chunk

    async def read(self, n):
        raise AssertionError("A single read(n) is unsafe for a streamed response")


class FakeResponse:
    def __init__(self, chunks, *, status=200, headers=None):
        self.content = FakeContent(chunks)
        self.status = status
        self.headers = headers or {"Content-Type": "application/rss+xml"}

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def raise_for_status(self):
        if self.status >= 400:
            raise ValueError(f"HTTP {self.status}")


class FakeSession:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.requests = []

    def get(self, url, **kwargs):
        self.requests.append((url, kwargs))
        return next(self.responses)


async def _download(*responses):
    session = FakeSession(responses)
    obj = type("Dummy", (), {"session": session})()
    return await _load_production_download()(obj, "https://example.org/rss")


def test_reads_all_chunks_even_if_first_chunk_is_incomplete():
    # The old read(MAX_BYTES + 1) can stop with just the first buffered chunk.
    response = FakeResponse([b"<rss>", b"<channel>", b"</channel></rss>"])
    data, status, content_type = asyncio.run(_download(response))
    assert data == b"<rss><channel></channel></rss>"
    assert status == 200
    assert content_type == "application/rss+xml"
    assert response.content.yielded == 3
    assert response.content.requested_chunk_size == 65536


def test_accepts_exact_limit_across_multiple_chunks():
    response = FakeResponse([b"A" * 65536 for _ in range(22)] + [b"B" * (MAX_BYTES - 22 * 65536)])
    data, _, _ = asyncio.run(_download(response))
    assert len(data) == MAX_BYTES
    assert data.endswith(b"B" * (MAX_BYTES - 22 * 65536))
    assert response.content.yielded == 23


def test_rejects_feed_larger_than_limit_even_if_header_lies():
    # Content-Length may be missing or describe the compressed payload only.
    response = FakeResponse(
        [b"A" * 900000, b"B" * 600001, b"SHOULD NOT BE READ"],
        headers={"Content-Length": "100", "Content-Type": "application/rss+xml"},
    )
    with pytest.raises(ValueError, match="zu groß"):
        asyncio.run(_download(response))
    # The reader stops immediately at the first over-limit chunk.
    assert response.content.yielded == 2


def test_rejects_late_overflow_after_full_limit():
    response = FakeResponse([b"x" * MAX_BYTES, b"y"])
    with pytest.raises(ValueError, match="zu groß"):
        asyncio.run(_download(response))
    assert response.content.yielded == 2


def test_returns_empty_response_at_eof():
    data, status, content_type = asyncio.run(_download(FakeResponse([])))
    assert data == b""
    assert status == 200
    assert content_type == "application/rss+xml"


def test_redirects_still_follow_explicitly():
    redirect = FakeResponse([], status=302, headers={"Location": "https://example.org/new"})
    result = FakeResponse([b"OK"])
    data, _, _ = asyncio.run(_download(redirect, result))
    assert data == b"OK"
