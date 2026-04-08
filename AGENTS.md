# AGENTS.md — Vibe Transcription

Audio transcription app with dual-mode architecture: **GPU-accelerated backend** (default when available) and **in-browser WASM fallback**. Vue 3 + Vite 8 + TypeScript 6 (strict mode). Python FastAPI backend with mlx-whisper (Apple Silicon) or faster-whisper (NVIDIA/CPU).

## Build & Test Commands

```bash
npm run dev              # Vite dev server on localhost:5173 (proxies /api → backend:8000)
npm run build            # vue-tsc type-check + vite build (MUST pass before PR)
npm run test             # Playwright fast tests (mock worker, ~10s, 26 tests)
npm run test:slow        # Playwright slow tests (real Whisper model, ~20s, downloads ~150MB on first run)
npm run test:all         # All Playwright projects
npm run test:unit        # Vitest unit tests (src/**/*.test.ts)
```

### Backend commands

```bash
# Start backend (requires Python venv setup)
cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# One-shot: build frontend + serve via FastAPI (single process, single port)
./dev.sh                 # default port 8000; PORT=9000 ./dev.sh for custom

# Backend integration tests (requires backend running on port 8000)
npx playwright test --project=backend
```

### Running a single test

```bash
# Playwright — by test name substring
npx playwright test --project=fast -g "file upload shows transcript"

# Playwright — by file
npx playwright test tests/fast.spec.ts --project=fast

# Vitest — by file
npx vitest run src/utils/vadPipeline.test.ts

# Vitest — by test name
npx vitest run -t "merges two segments"
```

### Type checking only

```bash
npx vue-tsc -b          # Same check as `npm run build` first step
```

## Project Structure

```
src/
  main.ts                     # App entry
  worker.ts                   # Web Worker — VAD → Whisper ASR (Vite-bundled, in-browser mode only)
  models.ts                   # Frontend ONNX model configs for in-browser mode (Base/Small/Medium × quantization)
  transformers-cdn.d.ts       # Ambient module types for CDN-loaded @huggingface/transformers
  App.vue                     # Root component — dual-mode orchestrator: file upload → transcribe → display → session save/restore
  components/
    DropZone.vue              # Drag-and-drop file input
    AudioPlayer.vue           # <audio> element wrapper with seek support
    ModelSelector.vue         # Model & quantization selector (in-browser ONNX models)
    SessionList.vue           # Sidebar with session history, new/delete/select actions
    StatusBar.vue             # Progress/status display during transcription
    TranscriptView.vue        # Word-level transcript with click-to-seek and auto-highlight
  composables/
    useTranscriber.ts         # In-browser mode: creates Web Worker, posts messages, updates reactive refs
    useBackendTranscriber.ts  # GPU backend mode: fetch + SSE streaming, same reactive interface as useTranscriber
    useFileUpload.ts          # File validation + AudioContext decoding to Float32Array + original Blob
    useAudioPlayer.ts         # Audio playback state (currentTimeMs, seekTo)
    useSessionStore.ts        # IndexedDB CRUD for session persistence (idb library)
  utils/
    logger.ts                 # createLogger(tag) — console wrapper with [HH:MM:SS.mmm][Tag] prefix
    vadPipeline.ts            # Pure functions: mergeVadSegments, offsetTimestamps, sliceAudio
    vadPipeline.test.ts       # Vitest unit tests for above
backend/
  main.py                     # FastAPI app — /api/info, /api/transcribe (SSE), static file serving
  models.py                   # Backend model registry (large-v3-turbo, large-v3, small, base)
  requirements.txt            # Python dependencies
  engine/
    __init__.py               # TranscriptionEngine ABC + TranscribeResult dataclass
    hardware.py               # Auto-detect Apple Silicon / CUDA / CPU
    factory.py                # Engine selection based on detected hardware
    mlx_whisper_engine.py     # MLX backend (Apple Silicon)
    faster_whisper_engine.py  # faster-whisper backend (NVIDIA / CPU)
tests/
  fixtures.ts                 # Mock worker script, MockAudioContext, test helpers
  fixtures/test_vibe.m4a      # Real audio fixture for E2E
  fast.spec.ts                # 26 Playwright tests with mock worker (VAD routes blocked → fallback)
  slow.spec.ts                # 1 Playwright test with real Whisper model (in-browser)
  backend.spec.ts             # 4 Playwright tests for GPU backend integration
  benchmark/                  # WER benchmark suite (real model, 900s timeout)
dev.sh                        # One-shot launcher: vite build → uvicorn serve
vite.config.ts                # Vite config with /api proxy to backend (BACKEND_PORT env)
playwright.config.ts          # 4 projects: fast, slow, backend, benchmark
```

## Architecture Notes

### Dual-mode transcription

The app supports two transcription modes, selected automatically on mount:

1. **GPU backend** (default when available) — `useBackendTranscriber.ts` sends the audio file via `POST /api/transcribe` to a Python FastAPI server. The backend runs Whisper natively (mlx-whisper on Apple Silicon, faster-whisper on NVIDIA/CPU) and streams progress via SSE. Models: large-v3-turbo (default with GPU), large-v3, small, base.

2. **In-browser WASM** (fallback) — `useTranscriber.ts` creates a Vite-bundled Web Worker (`src/worker.ts`) that runs the full pipeline: VAD (Silero via `@ricky0123/vad-web`) → segment merging → Whisper ASR (`@huggingface/transformers@3`, CDN dynamic import). ONNX models: Base/Small/Medium with quantization options (q4/q8/fp16/fp32).

### Mode selection (App.vue onMounted)

On mount, `backendTranscriber.checkBackend()` fetches `GET /api/info`. If reachable → `useBackend = true` (GPU mode); if unreachable → fallback to in-browser with a warning banner (`#backend-warning`). User can toggle modes via `#backend-toggle` checkbox.

### Backend architecture (backend/)

- **Hardware detection** (`engine/hardware.py`): Priority order — Apple Silicon + MLX → NVIDIA CUDA → CPU fallback.
- **Engine factory** (`engine/factory.py`): Creates `MlxWhisperEngine` or `FasterWhisperEngine` based on detected hardware.
- **Transcription API** (`main.py`): `POST /api/transcribe` accepts multipart file upload, runs transcription in a thread, streams SSE events (`model-loading`, `transcribing`, `result`, `error`) via a queue.
- **Static serving**: When `dist/` exists, FastAPI serves the built frontend as SPA (catch-all route). This enables single-process deployment via `dev.sh`.

### Frontend transcriber interface

Both `useTranscriber` and `useBackendTranscriber` expose the same reactive interface: `status`, `result`, `error`, `isProcessing`, `modelInfo`, `downloadProgress`, `transcriptionTimeSec`, `transcriptionProgress`, `transcribe()`, `resetError()`. `App.vue` uses a computed `activeTranscriber` to switch between them seamlessly.

### Worker pipeline (in-browser mode)

- `src/worker.ts` is Vite-bundled and runs VAD (Silero via `@ricky0123/vad-web`, npm-bundled) → segment merging → Whisper ASR (`@huggingface/transformers@3`, CDN dynamic import via `/* @vite-ignore */`). Keeps ~50–100 MB of ONNX/WASM runtime off the main thread.
- **VAD fallback**: If VAD fails to load (ONNX model unavailable), the worker falls back to treating the entire audio as one segment.
- **Worker instantiation**: `new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' })` — Vite resolves and bundles the worker at build time.
- **CDN types**: `src/transformers-cdn.d.ts` provides ambient module declarations for the CDN URL, enabling full type safety on the dynamic import.

### Session persistence

IndexedDB via `idb` library. 3-store schema: `sessions` (metadata), `sessionBlobs` (audio Blob), `sessionTranscripts` (TranscribeResult). Auto-saves on transcription complete. Vue reactive proxies must be stripped via `JSON.parse(JSON.stringify())` before IndexedDB storage (DataCloneError).

## Code Style

No ESLint or Prettier configured. Follow these conventions observed in the codebase:

### Formatting
- 2-space indentation
- Single quotes for strings
- No semicolons
- Trailing commas in multi-line arrays/objects

### TypeScript
- `strict: true` — never weaken it
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use `type` keyword for type aliases; `interface` only for shapes with `extends` potential
- Explicit generic on `ref<T>()` when initial value doesn't convey the full type
- Error catch blocks: `catch (err: unknown)` then `err instanceof Error ? err.message : String(err)`
- Type-only imports: `import type { Foo } from '...'`

### Vue Components
- `<script setup lang="ts">` — no Options API
- SFC block order: `<script setup>` → `<template>` → `<style scoped>`
- Props via `defineProps<{ ... }>()`, emits via `defineEmits<{ ... }>()`
- Composables in `src/composables/`, named `use*.ts`, return plain objects (not arrays)
- Template refs typed as `ref<InstanceType<typeof Component> | null>(null)`

### Imports
Order: vue → external packages → local modules (relative paths)
```ts
import { ref, computed } from 'vue'
import { NonRealTimeVAD } from '@ricky0123/vad-web'
import { mergeVadSegments } from '../utils/vadPipeline'
import type { VadSegment } from '../utils/vadPipeline'
```

### Naming
- `camelCase` for variables, functions, composables, props, emits
- `PascalCase` for components, types, interfaces
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `VALID_TYPES`)
- Test files: `*.test.ts` (Vitest) in `src/`, `*.spec.ts` (Playwright) in `tests/`

### CSS
- Scoped styles (`<style scoped>`) on all components
- CSS custom properties defined in `App.vue :root` — reuse them, don't hardcode colors
- Key variables: `--accent-color`, `--border-color`, `--secondary-text`, `--spacing-unit`, `--radius`
- Use `calc(var(--spacing-unit) * N)` for spacing

### HTML / Accessibility
- Key elements have explicit `id` attributes for test selectors (e.g., `#drop-zone`, `#status-container`, `#transcript-container`, `#error-container`, `#session-sidebar`, `#backend-toggle`, `#vad-toggle`, `#backend-warning`)
- Preserve these IDs — Playwright tests depend on them

### File Deletion
- **NEVER delete files directly.** Add a TODO item describing the deletion and wait for user approval.
- Deletion requires explicit user consent — if you delete first, the pre-commit hook will block the entire workflow.

### Error Handling
- User-facing errors go to reactive `error` ref, displayed in `#error-container`
- Never swallow errors silently; either surface to user or log
- Worker errors propagate via `{ type: 'error', message: string }` protocol
- Backend errors propagate via SSE `error` event with `{ message: string }`
- Use `finally` blocks for cleanup (close AudioContext, reset `isProcessing`)

## Testing Conventions

### Fast tests (Playwright)
- Mock the worker via `setupMockWorker(page, options?)` from `tests/fixtures.ts`
- Mock AudioContext is injected via `page.addInitScript`
- VAD ONNX routes (`**/*silero*.onnx`, `**/ort-wasm*`) are blocked → VAD falls back
- Always wait for `#transcript-container` to be visible before asserting on transcript content
- Use `page.locator()` with CSS selectors; prefer `#id` for containers, `.class` for repeated elements

### Backend tests (Playwright)
- Require a running backend (`cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000`)
- Verify auto-detection (`#backend-toggle` checked), SSE progress, transcript rendering, click-to-seek
- Test fallback warning banner when backend is unreachable (route abort)
- 120s timeout; run via `npx playwright test --project=backend`

### Unit tests (Vitest)
- Co-located with source: `src/utils/foo.test.ts` tests `src/utils/foo.ts`
- Pure functions only — no DOM, no Vue component testing
- Import from vitest: `import { describe, it, expect } from 'vitest'`

### Slow tests (Playwright)
- No mocking — real Vite-bundled worker, real Whisper model download
- 300s timeout; captures console errors and page errors
- Only run explicitly via `npm run test:slow`

### Benchmark tests (Playwright)
- WER (Word Error Rate) evaluation against reference transcripts
- 900s timeout; run via `npx playwright test --project=benchmark`

## Worker Protocol (src/worker.ts) — In-browser mode only

Messages from main thread to worker:
```
{ type: 'transcribe', audio: Float32Array, model?: string, dtype?: string, useVad?: boolean }
```

Messages from worker to main thread:
```
{ type: 'progress', status: string }
{ type: 'model-info', model: string, dtype: string }
{ type: 'download-progress', file: string, progress: number, loaded: number, total: number }
{ type: 'transcription-progress', completedChunks: number, totalChunks: number }
{ type: 'result', data: { text: string, chunks: Array<{ text: string, timestamp: [number, number] }> } }
{ type: 'error', message: string }
```

## Backend API Protocol (backend/main.py) — GPU mode

### `GET /api/info`
```json
{ "hardware": "apple_silicon", "device": "Apple M1 Pro", "memory_gb": 16.0, "engine": "mlx-whisper", "default_model": "large-v3-turbo", "available_models": [...] }
```

### `POST /api/transcribe?model=large-v3-turbo&vad=true`
Multipart file upload. Returns SSE stream:
```
event: model-loading
data: { "status": "Loading model large-v3-turbo..." }

event: transcribing
data: { "status": "Transcribing...", "progress": 45 }

event: result
data: { "text": "...", "chunks": [{ "text": "word", "timestamp": [0.0, 0.5] }, ...] }

event: error
data: { "message": "error description" }
```
