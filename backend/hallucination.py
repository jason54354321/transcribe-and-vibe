"""Hallucination filter for Whisper transcription output.

Whisper degenerates into repetition loops (e.g. "month in the month in the ...")
whose word timestamps collapse into a tiny time span — a physically impossible
speaking rate. Such runs are detected purely by word density (words per second)
and removed before the transcript is persisted. Repetition alone is NOT a signal:
emphatic speech and song lyrics legitimately repeat at human pace.
"""

from __future__ import annotations

import re

# A sustained rate above this is beyond any human speaker; hallucination loops
# collapse timestamps and sit far above it (often 50-200+ w/s).
MAX_WORDS_PER_SEC = 16.0
DENSITY_WINDOW_SEC = 1.0
# Collapsed timestamps yield a ~0s span; floor it so density stays finite while
# still exploding for genuine collapses.
MIN_SPAN_SEC = 0.1
# Require a real run so a couple of naturally adjacent fast words are never dropped.
MIN_RUN_WORDS = 8

Chunk = dict[str, object]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def _start(chunk: Chunk) -> float | None:
    ts = chunk.get("timestamp")
    if not isinstance(ts, (list, tuple)) or len(ts) < 1:
        return None
    return ts[0] if isinstance(ts[0], (int, float)) else None


def _word_count(chunk: Chunk) -> int:
    text = chunk.get("text")
    if not isinstance(text, str):
        return 1
    return max(len(_tokenize(text)), 1)


def filter_hallucinations(chunks: list[Chunk]) -> list[Chunk]:
    """Remove contiguous runs whose local word density is superhuman.

    Chunks without a numeric start timestamp are always kept unchanged.
    """
    if not chunks:
        return []

    ts_idx = [i for i, c in enumerate(chunks) if _start(c) is not None]
    if not ts_idx:
        return list(chunks)

    starts = [_start(chunks[i]) for i in ts_idx]
    counts = [_word_count(chunks[i]) for i in ts_idx]

    prefix = [0] * (len(counts) + 1)
    for k, n in enumerate(counts):
        prefix[k + 1] = prefix[k] + n

    drop_ts: set[int] = set()
    n = len(ts_idx)
    j = 0
    for i in range(n):
        s_i = starts[i]
        assert s_i is not None
        if j < i + 1:
            j = i + 1
        while j < n:
            s_j = starts[j]
            assert s_j is not None
            if s_j >= s_i + DENSITY_WINDOW_SEC:
                break
            j += 1

        words = prefix[j] - prefix[i]
        s_last = starts[j - 1]
        assert s_last is not None
        span = max(s_last - s_i, MIN_SPAN_SEC)
        density = words / span

        if words >= MIN_RUN_WORDS and density > MAX_WORDS_PER_SEC:
            drop_ts.update(range(i, j))

    drop = {ts_idx[k] for k in drop_ts}
    return [c for idx, c in enumerate(chunks) if idx not in drop]
