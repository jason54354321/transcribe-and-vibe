# AGENTS.md — Vibe Transcription

Audio transcription app with **backend-only transcription**: the frontend always sends audio to the FastAPI backend, which runs mlx-whisper on Apple Silicon or faster-whisper on NVIDIA/CPU. Vue 3 + Vite 8 + TypeScript 6 (strict mode).

## Build & Test Commands

```bash
bun run dev              # Vite dev server on localhost:5173 (proxies /api → backend:8000)
bun run build            # vue-tsc type-check + vite build (MUST pass before PR)
bun run test             # Playwright fast tests with mock backend/SSE
bun run test:backend:isolated # Starts isolated backend/frontend ports, then runs backend Playwright
bun run test:slow        # Playwright slow tests against the real backend/runtime
bun run test:all         # All Playwright projects
bun run test:unit        # Vitest unit tests (src/**/*.test.ts)
```

### Backend commands

```bash
# Start backend (requires Python venv setup)
cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# One-shot: build frontend + serve via FastAPI (single process, single port)
./dev.sh                 # default port 8000; PORT=9000 ./dev.sh for custom

# Backend integration tests (requires backend running on port 8000)
bunx playwright test --project=backend

# Isolated backend integration tests (spawns dedicated backend/frontend ports automatically)
bun run test:backend:isolated
```

### Running a single test

```bash
# Playwright — by test name substring
bunx playwright test --project=fast -g "file upload shows transcript"

# Playwright — by file
bunx playwright test tests/fast/core.spec.ts --project=fast

# Vitest — by file
bunx vitest run src/utils/sessionOrchestration.test.ts

# Vitest — by test name
bunx vitest run -t "prepends temporary session"
```

### Type checking only

```bash
bunx vue-tsc -b          # Same check as `bun run build` first step
```

## Project Structure

```
src/
  main.ts                     # App entry
  App.vue                     # Root component — backend-only orchestrator: upload → backend SSE → display → session save/restore
  components/
    DropZone.vue              # Drag-and-drop file input
    AudioPlayer.vue           # <audio> element wrapper with seek support
    SessionList.vue           # Sidebar with session history, new/delete/select actions
    StatusBar.vue             # Progress/status display + runtime info area
    TranscriptionControls.vue # Model/VAD/theme/highlight controls
    TranscriptView.vue        # Word-level transcript with click-to-seek and auto-highlight
  composables/
    useBackendTranscriber.ts  # Backend-only transcription path: fetch + SSE streaming + runtime metadata
    useFileUpload.ts          # File validation + AudioContext decoding to Float32Array + original Blob
    useAudioPlayer.ts         # Audio playback state (currentTimeMs, seekTo)
    useSessionOrchestration.ts # Session lifecycle orchestration across upload/transcription/restore
    useSessionStore.ts        # IndexedDB CRUD for session persistence (idb library)
  utils/
    logger.ts                 # createLogger(tag) — console wrapper with [HH:MM:SS.mmm][Tag] prefix
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
  fixtures.ts                 # Mock backend/SSE responses, MockAudioContext, test helpers
  fixtures/test_vibe.m4a      # Real audio fixture for E2E
  fast/                       # Playwright fast tests using mock backend/SSE
  slow.spec.ts                # Real backend/runtime smoke test
  backend.spec.ts             # Playwright tests for backend integration
  benchmark/                  # WER benchmark suite (real model, 900s timeout)
dev.sh                        # One-shot launcher: vite build → uvicorn serve
vite.config.ts                # Vite config with /api proxy to backend (BACKEND_PORT env)
playwright.config.ts          # Playwright config; supports isolated baseURL/webServer via env vars
scripts/test-backend-isolated.mjs # Isolated backend/frontend launcher for backend Playwright
```

## Architecture Notes

### Backend-only transcription

The app has a single transcription path:

1. **Backend transcription** — `useBackendTranscriber.ts` sends the audio file via `POST /api/transcribe` to the FastAPI server. The backend selects the best available local compute path automatically: mlx-whisper on Apple Silicon, faster-whisper on NVIDIA CUDA, or faster-whisper CPU fallback when no GPU acceleration is available.

### Mode selection (App.vue onMounted)

On mount, `backendTranscriber.checkBackend()` fetches `GET /api/info`. If reachable, the app uses backend transcription and initializes the default backend model. If unreachable, the app records backend-unavailable state and transcription attempts fail with a clear blocking error. There is no browser fallback mode.

### Backend architecture (backend/)

- **Hardware detection** (`engine/hardware.py`): Priority order — Apple Silicon + MLX → NVIDIA CUDA → CPU fallback.
- **Engine factory** (`engine/factory.py`): Creates `MlxWhisperEngine` or `FasterWhisperEngine` based on detected hardware.
- **Transcription API** (`main.py`): `POST /api/transcribe` accepts multipart file upload, runs transcription in a thread, streams SSE events (`model-loading`, `model-info`, `transcribing`, `transcription-progress`, `result`, `error`) via a queue.
- **Static serving**: When `dist/` exists, FastAPI serves the built frontend as SPA (catch-all route). This enables single-process deployment via `dev.sh`.

### Frontend transcriber interface

`useBackendTranscriber` exposes the frontend transcription state: `status`, `result`, `error`, `isProcessing`, `modelInfo`, `downloadProgress`, `transcriptionTimeSec`, `transcriptionProgress`, `transcribe()`, and `resetError()`. `App.vue` also merges runtime metadata from live SSE, `/api/info`, and restored session results so the runtime info area remains visible after completion.

### SSE progress flow

- `model-loading` carries user-visible loading status.
- `model-info` carries runtime metadata for the active job: architecture, model, dtype, engine, and execution backend.
- `transcribing` carries percentage-oriented status updates.
- `transcription-progress` carries chunk-level progress (`completed_chunks`, `total_chunks`) for determinate progress UI.
- `result` returns the transcript payload and session metadata used for restore/runtime info.

### Session persistence

IndexedDB via `idb` library. 3-store schema: `sessions` (metadata), `sessionBlobs` (audio Blob), `sessionTranscripts` (TranscribeResult). Auto-saves on transcription complete. Vue reactive proxies must be stripped via `JSON.parse(JSON.stringify())` before IndexedDB storage (DataCloneError).

## Code Style

ESLint and Prettier are configured. Follow these conventions observed in the codebase:

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
import { openDB } from 'idb'
import { createLogger } from '../utils/logger'
import type { SessionRecord } from '../types/session'
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
- Key elements have explicit `id` attributes for test selectors (e.g., `#drop-zone`, `#status-container`, `#transcript-container`, `#error-container`, `#session-sidebar`, `#vad-toggle`, `#runtime-info`)
- Preserve these IDs — Playwright tests depend on them

### File Deletion
- **NEVER delete files directly.** Add a TODO item describing the deletion and wait for user approval.
- Deletion requires explicit user consent — if you delete first, the pre-commit hook will block the entire workflow.

### Error Handling
- User-facing errors go to reactive `error` ref, displayed in `#error-container`
- Never swallow errors silently; either surface to user or log
- Backend errors propagate via SSE `error` event with `{ message: string }`
- Use `finally` blocks for cleanup (close AudioContext, reset `isProcessing`)

## Testing Conventions

### Fast tests (Playwright)
- Mock the backend via `setupMockBackend(page, options?)` from `tests/fixtures.ts`
- Mock AudioContext is injected via `page.addInitScript`
- Fast tests assert backend-only flow, runtime info, SSE progress, and backend-unavailable behavior
- Always wait for `#transcript-container` to be visible before asserting on transcript content
- Use `page.locator()` with CSS selectors; prefer `#id` for containers, `.class` for repeated elements

### Backend tests (Playwright)
- Require a running backend (`cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000`)
- Verify model detection, SSE progress, transcript rendering, click-to-seek, and backend-unavailable blocking flow
- Test backend-unreachable behavior through route aborts and transcription-time failures
- 120s timeout; run via `bunx playwright test --project=backend` or `bun run test:backend:isolated`

### Unit tests (Vitest)
- Co-located with source: `src/utils/foo.test.ts` tests `src/utils/foo.ts`
- Pure functions only — no DOM, no Vue component testing
- Import from vitest: `import { describe, it, expect } from 'vitest'`

### Slow tests (Playwright)
- No mocking — real backend/runtime transcription path
- 300s timeout; captures console errors and page errors
- Only run explicitly via `bun run test:slow`

### Benchmark tests (Playwright)
- WER (Word Error Rate) evaluation against reference transcripts
- 900s timeout; run via `bunx playwright test --project=benchmark`

## Backend API Protocol (backend/main.py)

### `GET /api/info`
```json
{ "hardware": "apple_silicon", "device": "Apple M1 Pro", "memory_gb": 16.0, "engine": "mlx-whisper", "execution_backend": "mlx", "default_model": "large-v3-turbo", "available_models": [...] }
```

### `POST /api/transcribe?model=large-v3-turbo&vad=true`
Multipart file upload. Returns SSE stream:
```
event: model-loading
data: { "status": "Loading model large-v3-turbo..." }

event: model-info
data: { "hardware": "apple_silicon", "model": "large-v3-turbo", "dtype": "float16", "engine": "mlx-whisper", "execution_backend": "mlx" }

event: transcribing
data: { "status": "Transcribing...", "progress": 45 }

event: transcription-progress
data: { "completed_chunks": 12, "total_chunks": 40 }

event: result
data: { "text": "...", "chunks": [{ "text": "word", "timestamp": [0.0, 0.5] }, ...], "hardware": "apple_silicon", "model": "large-v3-turbo", "dtype": "float16", "engine": "mlx-whisper", "execution_backend": "mlx" }

event: error
data: { "message": "error description" }
```
