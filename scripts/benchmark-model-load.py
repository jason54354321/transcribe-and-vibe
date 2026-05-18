"""Benchmark faster-whisper model load time.

Measures cold load (first construction) and warm load (cached on disk, re-init).
Run from repo root:
    .venv/bin/python scripts/benchmark-model-load.py
Or with the backend venv:
    backend/.venv/bin/python scripts/benchmark-model-load.py
"""

from __future__ import annotations

import gc
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / 'backend'))

MODELS = [
    ('base', 'int8'),
    ('small', 'int8'),
    ('large-v3-turbo', 'int8'),
]

DEVICE = 'cpu'


def load_once(model_id: str, compute_type: str):
    from faster_whisper import WhisperModel
    t0 = time.perf_counter()
    model = WhisperModel(model_id, device=DEVICE, compute_type=compute_type)
    elapsed = time.perf_counter() - t0
    return model, elapsed


def main():
    results = []
    for model_id, compute_type in MODELS:
        print(f'\n=== {model_id} (device={DEVICE}, compute={compute_type}) ===', flush=True)

        # Cold: first construction in this process (may include HF download if missing)
        m1, cold = load_once(model_id, compute_type)
        print(f'  cold load: {cold:.2f}s', flush=True)
        del m1
        gc.collect()

        # Warm: re-construct after first load (file already on disk + Python imports cached)
        m2, warm = load_once(model_id, compute_type)
        print(f'  warm load: {warm:.2f}s', flush=True)
        del m2
        gc.collect()

        results.append({
            'model': model_id,
            'device': DEVICE,
            'compute_type': compute_type,
            'cold_load_s': round(cold, 3),
            'warm_load_s': round(warm, 3),
        })

    print('\n=== Summary ===')
    print(f"{'model':<20}{'cold (s)':>12}{'warm (s)':>12}")
    for r in results:
        print(f"{r['model']:<20}{r['cold_load_s']:>12.2f}{r['warm_load_s']:>12.2f}")

    out = REPO_ROOT / 'tests' / 'benchmark' / 'model-load-results.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2))
    print(f'\nResults written to {out.relative_to(REPO_ROOT)}')


if __name__ == '__main__':
    main()
