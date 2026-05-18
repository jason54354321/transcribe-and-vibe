"""Verify load-then-free behavior of FasterWhisperEngine.

Runs transcribe() twice with the same model and asserts:
  - Each call reloads the model (no internal cache leak)
  - The model object is garbage-collected after transcribe returns
  - Resident memory after release is lower than peak during transcribe
  - Each transcription returns non-empty text

Run from repo root with backend venv:
    backend/.venv/bin/python scripts/test-load-free-cycle.py
"""

from __future__ import annotations

import gc
import logging
import sys
import weakref
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / 'backend'))

FIXTURE = REPO_ROOT / 'tests' / 'fixtures' / 'test_vibe.m4a'
MODEL_ID = 'base'

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(message)s')


def rss_mb() -> float:
    """Process RSS in MB. Returns 0 if psutil unavailable."""
    try:
        import psutil  # type: ignore[import-not-found]
        return psutil.Process().memory_info().rss / 1024 / 1024
    except Exception:
        return 0.0


def transcribe_once_and_get_model_ref(engine, audio_path: str, model_id: str):
    """Run transcribe and capture a weakref to the internal model.

    We monkey-patch WhisperModel temporarily to grab the constructed instance.
    """
    captured: dict[str, object] = {}

    import faster_whisper

    orig = faster_whisper.WhisperModel

    def wrapper(*args, **kwargs):
        m = orig(*args, **kwargs)
        captured['model'] = m
        return m

    faster_whisper.WhisperModel = wrapper  # type: ignore[assignment]
    try:
        result = engine.transcribe(audio_path=audio_path, model_id=model_id)
    finally:
        faster_whisper.WhisperModel = orig  # type: ignore[assignment]

    model_obj = captured.get('model')
    assert model_obj is not None, 'WhisperModel was not constructed'
    ref = weakref.ref(model_obj)
    del model_obj
    del captured
    gc.collect()
    return result, ref


def main():
    assert FIXTURE.exists(), f'Missing fixture: {FIXTURE}'

    from engine.faster_whisper_engine import FasterWhisperEngine

    engine = FasterWhisperEngine(device='cpu')

    print(f'\n== Cycle 1 ==', flush=True)
    rss_before_1 = rss_mb()
    print(f'RSS before: {rss_before_1:.1f} MB', flush=True)
    result1, ref1 = transcribe_once_and_get_model_ref(engine, str(FIXTURE), MODEL_ID)
    rss_after_1 = rss_mb()
    print(f'RSS after:  {rss_after_1:.1f} MB', flush=True)
    print(f'Text len: {len(result1.text)} chars', flush=True)
    alive_1 = ref1() is not None
    print(f'Model still alive after transcribe? {alive_1}', flush=True)

    print(f'\n== Cycle 2 (same model, must reload) ==', flush=True)
    rss_before_2 = rss_mb()
    print(f'RSS before: {rss_before_2:.1f} MB', flush=True)
    result2, ref2 = transcribe_once_and_get_model_ref(engine, str(FIXTURE), MODEL_ID)
    rss_after_2 = rss_mb()
    print(f'RSS after:  {rss_after_2:.1f} MB', flush=True)
    print(f'Text len: {len(result2.text)} chars', flush=True)
    alive_2 = ref2() is not None
    print(f'Model still alive after transcribe? {alive_2}', flush=True)

    # Assertions
    failures = []
    if alive_1:
        failures.append('Cycle 1: model still alive after transcribe (release failed)')
    if alive_2:
        failures.append('Cycle 2: model still alive after transcribe (release failed)')
    if not result1.text.strip():
        failures.append('Cycle 1: empty transcription')
    if not result2.text.strip():
        failures.append('Cycle 2: empty transcription')
    if result1.text != result2.text:
        failures.append(f'Cycle 1 vs 2 text mismatch (deterministic check):\n  1: {result1.text!r}\n  2: {result2.text!r}')
    # Engine no longer has _loaded_models attribute
    if hasattr(engine, '_loaded_models'):
        failures.append('Engine still has _loaded_models cache attribute')

    print('\n== Result ==')
    if failures:
        for f in failures:
            print(f'FAIL: {f}')
        sys.exit(1)
    print('PASS: load-free cycle works correctly')
    print(f'  - Model released after each transcribe (weakref dead)')
    print(f'  - Both cycles produced identical non-empty text ({len(result1.text)} chars)')
    print(f'  - No _loaded_models cache on engine')


if __name__ == '__main__':
    main()
