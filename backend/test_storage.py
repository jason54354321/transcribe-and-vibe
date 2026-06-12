"""Plain-assert round-trip tests for the SQLite session store."""

from __future__ import annotations

import os
import tempfile


def run() -> None:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    os.unlink(path)
    os.environ['VIBE_DB_PATH'] = path

    import storage

    try:
        storage.init_db()

        assert storage.list_sessions() == []
        assert storage.get_session('missing') is None
        assert storage.get_audio('missing') is None

        transcript = {'text': 'hello world', 'chunks': [{'text': 'hello', 'timestamp': [0, 0.5]}]}
        storage.save_session(
            id='s1',
            name='first.m4a',
            created_at=1000,
            duration_sec=12.5,
            transcription_time_sec=3.2,
            transcript=transcript,
            audio=b'audio-bytes-1',
            audio_mime='audio/mp4',
        )
        storage.save_session(
            id='s2',
            name='second.m4a',
            created_at=2000,
            duration_sec=8.0,
            transcription_time_sec=None,
            transcript={'text': 'second', 'chunks': []},
            audio=b'audio-bytes-2',
            audio_mime='audio/webm',
        )

        listed = storage.list_sessions()
        assert len(listed) == 2
        assert listed[0]['id'] == 's2', 'newest first'
        assert listed[1]['id'] == 's1'
        assert 'transcript' not in listed[0]
        assert 'audio' not in listed[0]
        assert listed[0]['transcriptionTimeSec'] is None
        assert listed[1]['transcriptionTimeSec'] == 3.2
        assert listed[0]['createdAt'] == 2000
        assert listed[1]['durationSec'] == 12.5

        got = storage.get_session('s1')
        assert got is not None
        assert got['session']['id'] == 's1'
        assert got['session']['name'] == 'first.m4a'
        assert got['transcript'] == transcript

        audio = storage.get_audio('s1')
        assert audio is not None
        assert audio == (b'audio-bytes-1', 'audio/mp4')

        storage.save_session(
            id='s1',
            name='renamed.m4a',
            created_at=1500,
            duration_sec=20.0,
            transcription_time_sec=5.0,
            transcript=transcript,
            audio=b'audio-bytes-1b',
            audio_mime='audio/wav',
        )
        replaced = storage.get_session('s1')
        assert replaced is not None
        assert replaced['session']['name'] == 'renamed.m4a'
        assert storage.get_audio('s1') == (b'audio-bytes-1b', 'audio/wav')
        assert len(storage.list_sessions()) == 2

        storage.delete_session('s1')
        assert storage.get_session('s1') is None
        assert storage.get_audio('s1') is None
        assert len(storage.list_sessions()) == 1

        print('test_storage: OK')
    finally:
        if os.path.exists(path):
            os.unlink(path)


if __name__ == '__main__':
    run()
