"""API-level tests for the /api/sessions/{id}/audio Range-request support."""

from __future__ import annotations

import os
import tempfile
import time

import pytest


@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.unlink(path)
    monkeypatch.setenv('VIBE_DB_PATH', path)
    yield
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture()
def client(isolated_db):
    import storage
    from fastapi.testclient import TestClient
    from main import app

    storage.init_db()

    audio = bytes(range(256))
    storage.save_session(
        id='test-audio-session',
        name='test.wav',
        created_at=int(time.time() * 1000),
        duration_sec=1.0,
        transcription_time_sec=None,
        transcript={'text': 'hi', 'chunks': []},
        audio=audio,
        audio_mime='audio/wav',
    )

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c, audio


def test_audio_no_range_returns_200_with_accept_ranges(client):
    c, audio = client
    resp = c.get('/api/sessions/test-audio-session/audio')
    assert resp.status_code == 200
    assert resp.headers.get('accept-ranges') == 'bytes'
    assert resp.content == audio


def test_audio_range_returns_206_with_correct_slice(client):
    c, audio = client
    resp = c.get('/api/sessions/test-audio-session/audio', headers={'Range': 'bytes=0-9'})
    assert resp.status_code == 206
    assert resp.headers.get('accept-ranges') == 'bytes'
    assert 'content-range' in resp.headers
    assert resp.headers['content-range'] == f'bytes 0-9/{len(audio)}'
    assert resp.content == audio[:10]


def test_audio_range_open_ended(client):
    c, audio = client
    resp = c.get('/api/sessions/test-audio-session/audio', headers={'Range': 'bytes=10-'})
    assert resp.status_code == 206
    assert resp.content == audio[10:]
    assert resp.headers['content-range'] == f'bytes 10-{len(audio) - 1}/{len(audio)}'


def test_audio_range_unsatisfiable_returns_416(client):
    c, audio = client
    beyond = len(audio) + 100
    resp = c.get('/api/sessions/test-audio-session/audio', headers={'Range': f'bytes={beyond}-'})
    assert resp.status_code == 416


def test_audio_missing_session_returns_404(client):
    c, _ = client
    resp = c.get('/api/sessions/nonexistent/audio')
    assert resp.status_code == 404
