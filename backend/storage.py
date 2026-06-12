"""SQLite-backed session store for transcription sessions."""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_DB_PATH = Path(__file__).resolve().parent / 'vibe_sessions.db'
_lock = threading.Lock()


def _db_path() -> str:
    return os.getenv('VIBE_DB_PATH') or str(_DEFAULT_DB_PATH)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    duration_sec REAL NOT NULL DEFAULT 0,
                    transcription_time_sec REAL,
                    transcript_json TEXT NOT NULL,
                    audio BLOB NOT NULL,
                    audio_mime TEXT NOT NULL
                )
                '''
            )
            conn.commit()
        finally:
            conn.close()
    logger.info(f'Session store ready at {_db_path()}')


def save_session(
    id: str,
    name: str,
    created_at: int,
    duration_sec: float,
    transcription_time_sec: float | None,
    transcript: dict,
    audio: bytes,
    audio_mime: str,
) -> None:
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                '''
                INSERT OR REPLACE INTO sessions
                    (id, name, created_at, duration_sec, transcription_time_sec,
                     transcript_json, audio, audio_mime)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    id,
                    name,
                    created_at,
                    duration_sec,
                    transcription_time_sec,
                    json.dumps(transcript),
                    audio,
                    audio_mime,
                ),
            )
            conn.commit()
        finally:
            conn.close()


def _session_dict(row: sqlite3.Row) -> dict:
    return {
        'id': row['id'],
        'name': row['name'],
        'createdAt': row['created_at'],
        'durationSec': row['duration_sec'],
        'transcriptionTimeSec': row['transcription_time_sec'],
    }


def list_sessions() -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            '''
            SELECT id, name, created_at, duration_sec, transcription_time_sec
            FROM sessions
            ORDER BY created_at DESC
            '''
        ).fetchall()
    finally:
        conn.close()
    return [_session_dict(row) for row in rows]


def get_session(id: str) -> dict | None:
    conn = _connect()
    try:
        row = conn.execute(
            '''
            SELECT id, name, created_at, duration_sec, transcription_time_sec, transcript_json
            FROM sessions
            WHERE id = ?
            ''',
            (id,),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    return {
        'session': _session_dict(row),
        'transcript': json.loads(row['transcript_json']),
    }


def get_audio(id: str) -> tuple[bytes, str] | None:
    conn = _connect()
    try:
        row = conn.execute(
            'SELECT audio, audio_mime FROM sessions WHERE id = ?',
            (id,),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    return row['audio'], row['audio_mime']


def delete_session(id: str) -> None:
    with _lock:
        conn = _connect()
        try:
            conn.execute('DELETE FROM sessions WHERE id = ?', (id,))
            conn.commit()
        finally:
            conn.close()
