# ASR Benchmark

Measures Word Error Rate (WER) across a `model × sample` matrix on a real backend.
Each run is gated by an expected runtime (CPU or GPU) so a silent fallback never
produces misleading numbers, and every run drops a timestamped report under
`tests/benchmark/results/`.

## Quick start

```bash
bun run benchmark
```

That spins up an isolated backend + frontend on free ports, runs the benchmark
Playwright project, then writes a report. The wrapper is
`scripts/test-benchmark-isolated.mjs`; you do **not** need to start the backend
or frontend yourself.

## What gets measured

For each `(model, sample)` cell the test records:

- `WER %` plus `S` (substitutions) / `D` (deletions) / `I` (insertions)
- `usedTime` (wall-clock duration from file drop to transcript)
- Backend `hardware` / `executionBackend` (via `/api/info`)
- Hypothesis text and reference text

Matrix size is `models.length × samples.length`. Default config is `3 × 1`.

## Configuration

Single source of truth: [`benchmark.config.json`](./benchmark.config.json).

```json
{
  "expectedRuntime": "gpu",
  "models": [
    { "id": "base", "label": "Base" },
    { "id": "small", "label": "Small" },
    { "id": "large-v3", "label": "Large V3" }
  ],
  "samples": [
    {
      "id": "l1",
      "audioPath": "tests/benchmark/l1.mp3",
      "referencePath": "tests/benchmark/l1_answer.txt"
    }
  ]
}
```

### `expectedRuntime`: `"cpu"` or `"gpu"`

Checked against the backend's `/api/info` `acceleration` field before the matrix
starts. Mismatch throws immediately — protects against e.g. "I thought I was on
GPU but it fell back to CPU."

- GPU machine (CUDA / Apple Silicon): `"gpu"`
- CPU-only machine or forced CPU mode: `"cpu"`

### `models`

`id` must match a backend-supported model (drives `#model-select`).
`label` is the display name used in the on-disk report.

### `samples`

Paths are relative to the project root.
The reference file is plain UTF-8 text; lines containing `Transcribed by` or
`Upgrade to remove` are auto-stripped (third-party watermarks).

To add a sample:

1. Drop the audio (mp3 / wav / m4a) into `tests/benchmark/`
2. Drop a plain-text reference transcript alongside it
3. Add an entry to `benchmark.config.json`

## Output

Each run creates a folder under `tests/benchmark/results/<ISO-timestamp>/`
(gitignored) containing:

- `results.json` — full structured payload (runtime info + per-cell metrics)
- `summary.md` — human-readable markdown table

The console also prints a live table while the matrix is running.

## How it works

1. `scripts/test-benchmark-isolated.mjs` spawns backend (uvicorn) + frontend
   (vite) on free ports, then runs Playwright with `--project=benchmark`.
2. The frontend is started with `VITE_BENCHMARK_RAW_TRANSCRIPT=1`, which makes
   `App.vue` render a hidden `#benchmark-raw-transcript` div containing the raw
   `displayedResult.text`. The spec reads from there, avoiding any UI metadata.
3. The spec calls `/api/info`, runs `assertExpectedRuntime()`, then iterates the
   matrix uploading each sample for each model and recording results.
4. `writeBenchmarkArtifacts()` persists `results.json` + `summary.md`.

## Unit tests

The pure functions (WER math, runtime guard, report rendering, config parser)
are covered by Vitest:

```bash
bun run test:unit
```

Relevant files:

- `wer.test.ts` — `normalizeText`, `computeWER`, `computeAverageWER`,
  `formatBenchmarkDuration`
- `config.test.ts` — config schema + parse failures
- `report.test.ts` — `assertExpectedRuntime`, timestamp formatting, markdown
  table, on-disk artifact layout
