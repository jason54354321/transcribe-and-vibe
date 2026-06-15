"""Tests for hallucination filter."""

from __future__ import annotations

from hallucination import filter_hallucinations


def _chunk(text: str, start: float | None, end: float | None) -> dict:
    return {"text": text, "timestamp": [start, end]}


# --- hallucination cases ---

def test_dense_repetitive_block_removed():
    """221 words within ~0.25s — superhuman density, all must be dropped."""
    words = (["the", "month", "in"] * 74)[:221]
    chunks = [_chunk(f" {w}", 266.0 + i * 0.001, 266.0 + i * 0.001 + 0.001) for i, w in enumerate(words)]
    result = filter_hallucinations(chunks)
    assert result == [], f"Expected empty but got {len(result)} chunks"


def test_short_collapsed_cluster_removed():
    """A short but fully collapsed run (12 words in ~0.01s) is still superhuman."""
    chunks = [_chunk(" go", 5.0 + i * 0.001, 5.0 + i * 0.001 + 0.001) for i in range(12)]
    result = filter_hallucinations(chunks)
    assert result == []


def test_moderate_overspeed_run_removed():
    """A sustained run well above human rate (30 words/sec over 2s) is dropped."""
    chunks = [_chunk(f" w{i}", 10.0 + i * (1 / 30), 10.0 + i * (1 / 30) + 0.01) for i in range(60)]
    result = filter_hallucinations(chunks)
    assert result == []


# --- legitimate speech that must survive ---

def test_normal_speech_kept():
    """~2-3 words/sec, varied words — all kept."""
    words = [
        "hello", "world", "this", "is", "a", "test",
        "of", "normal", "speech", "rate", "with", "varied",
        "words", "and", "no", "repetition", "at", "all",
    ]
    chunks = [_chunk(f" {w}", i * 0.4, i * 0.4 + 0.3) for i, w in enumerate(words)]
    result = filter_hallucinations(chunks)
    assert result == chunks


def test_legitimate_repetition_kept():
    """Emphatic human repetition at normal pace must NOT be treated as hallucination."""
    # "no no no no no no please" spaced ~0.4s apart — ~2.5 w/s, clearly human.
    words = ["no", "no", "no", "no", "no", "no", "please"]
    chunks = [_chunk(f" {w}", i * 0.4, i * 0.4 + 0.3) for i, w in enumerate(words)]
    result = filter_hallucinations(chunks)
    assert result == chunks


def test_song_lyrics_repetition_kept():
    """A repeated lyric line at human pace survives (repetition alone is not a signal)."""
    words = ["la"] * 12
    chunks = [_chunk(f" {w}", i * 0.5, i * 0.5 + 0.4) for i, w in enumerate(words)]
    result = filter_hallucinations(chunks)
    assert result == chunks


def test_fast_short_burst_kept():
    """A legitimately fast but brief burst (4 words in 0.5s) must NOT be removed."""
    chunks = [
        _chunk(" one", 1.0, 1.1),
        _chunk(" two", 1.1, 1.2),
        _chunk(" three", 1.2, 1.3),
        _chunk(" four", 1.3, 1.5),
    ]
    result = filter_hallucinations(chunks)
    assert result == chunks


def test_fast_speaker_kept():
    """A sustained fast human speaker (~10 w/s) stays under the superhuman ceiling."""
    chunks = [_chunk(f" w{i}", i * 0.1, i * 0.1 + 0.08) for i in range(40)]
    result = filter_hallucinations(chunks)
    assert result == chunks


# --- mixed and edge cases ---

def test_mixed_normal_then_hallucination():
    """Normal speech followed by a hallucination tail — only tail removed."""
    normal_words = ["hello", "world", "this", "is", "a", "test"]
    normal_chunks = [_chunk(f" {w}", i * 0.4, i * 0.4 + 0.3) for i, w in enumerate(normal_words)]

    base = len(normal_words) * 0.4 + 1.0
    hall_words = (["month", "in", "the"] * 75)[:220]
    hall_chunks = [
        _chunk(f" {w}", base + i * 0.001, base + i * 0.001 + 0.001)
        for i, w in enumerate(hall_words)
    ]

    result = filter_hallucinations(normal_chunks + hall_chunks)
    assert result == normal_chunks, (
        f"Expected only normal chunks but got {len(result)} (normal={len(normal_chunks)})"
    )


def test_empty_list():
    assert filter_hallucinations([]) == []


def test_none_timestamps_pass_through():
    """Chunks with None timestamps are never removed."""
    chunks = [
        _chunk(" hello", None, None),
        _chunk(" world", None, None),
    ]
    result = filter_hallucinations(chunks)
    assert result == chunks


def test_mixed_none_and_hallucination():
    """None-timestamp chunks are kept even when surrounded by hallucinations."""
    no_ts = [_chunk(" unknown", None, None)]
    hall = [_chunk(" the", 10.0 + i * 0.001, 10.0 + i * 0.001 + 0.001) for i in range(100)]
    result = filter_hallucinations(no_ts + hall)
    assert result == no_ts


def test_large_clean_transcript_is_fast():
    """Guard against the prior O(n^3) regression: filtering stays quick on clean input."""
    import time
    chunks = [_chunk(f" word{i}", i * 0.3, i * 0.3 + 0.25) for i in range(3000)]
    t0 = time.perf_counter()
    result = filter_hallucinations(chunks)
    elapsed = time.perf_counter() - t0
    assert result == chunks
    assert elapsed < 0.5, f"Filtering 3000 clean words took {elapsed:.2f}s"
