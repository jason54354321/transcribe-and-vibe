# Vibe Transcription

Local audio transcription powered by [Whisper](https://github.com/openai/whisper). Supports two modes:

- **In-browser** — WebAssembly via [Transformers.js](https://huggingface.co/docs/transformers.js), zero backend required
- **GPU-accelerated backend** — Python FastAPI with [mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) (Apple Silicon) or [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (NVIDIA/CPU)

## Features

- **Drag & drop** audio files (mp3, wav, m4a, ogg, up to 100 MB)
- **Word-level timestamps** — click any word to seek the audio
- **Interactive transcript** — auto-highlights the current word during playback
- **GPU auto-detection** — Apple Silicon → MLX, NVIDIA → CUDA, CPU fallback
- **SSE progress streaming** — real-time transcription progress from backend
- **Session persistence** — IndexedDB saves transcription history across sessions
- **Works offline** — in-browser mode works after first model download

## Prerequisites

- **[Bun](https://bun.sh/)** ≥ 1.x
- **Python** ≥ 3.9 (for GPU backend only)
- **ffmpeg** (for GPU backend — `brew install ffmpeg` on macOS)

## Quick Start (Frontend Only)

```bash
# Clone
git clone git@github.com:jason54354321/transcribe-and-vibe.git
cd transcribe-and-vibe

# Install dependencies
bun install

# Start dev server (http://localhost:5173)
bun run dev
```

This runs the in-browser Whisper mode — no Python backend needed.

## Quick Start (With GPU Backend)

```bash
# 1. Install frontend dependencies
bun install

# 2. Set up Python backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..

# 3. One-shot start (build frontend + serve via FastAPI)
./dev.sh
```

`dev.sh` builds the frontend (`vite build`), then starts FastAPI on a free port (default 8000). The backend serves both the API and the static frontend — single process, single port.

```bash
# Custom port
PORT=9000 ./dev.sh
```

The app auto-detects the GPU backend on load. If the backend is unreachable, it falls back to in-browser mode with a warning banner.

## Development

### Frontend (Vite HMR)

```bash
bun run dev              # Vite dev server on localhost:5173
```

Vite proxies `/api` → `http://127.0.0.1:8000` (configurable via `BACKEND_PORT` env var). To use HMR with the backend, start them separately:

```bash
# Terminal 1: Backend
cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2: Frontend with HMR
bun run dev
```

### Backend (FastAPI)

```bash
cd backend
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

API endpoints:
- `GET /api/info` — hardware, engine, default model, available models
- `POST /api/transcribe` — multipart file upload, SSE progress stream

### Build

```bash
bun run build            # vue-tsc type-check + vite build
```

## Testing

```bash
bun run test             # Fast tests — mock worker, ~10s (26 tests)
bun run test:slow        # Slow E2E — real Whisper model, ~20s (downloads ~150 MB on first run)
bun run test:all         # All Playwright projects
bun run test:unit        # Vitest unit tests (src/**/*.test.ts)
```

### Backend Tests

Requires the GPU backend running on port 8000 (or set `BACKEND_PORT`):

```bash
# Start backend first
cd backend && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 &

# Run backend tests (4 tests)
bunx playwright test --project=backend
```

### Running a Single Test

```bash
# Playwright — by name
bunx playwright test --project=fast -g "file upload shows transcript"

# Playwright — by file
bunx playwright test tests/fast.spec.ts --project=fast

# Vitest — by file
bunx vitest run src/utils/vadPipeline.test.ts

# Vitest — by name
bunx vitest run -t "merges two segments"
```

## Project Structure

```
src/
  main.ts                     # App entry
  worker.ts                   # Web Worker — VAD → Whisper ASR (Vite-bundled)
  App.vue                     # Root component — file upload → transcribe → display
  models.ts                   # Frontend ONNX model configs (in-browser)
  components/
    AudioPlayer.vue           # <audio> element wrapper with seek support
    DropZone.vue              # Drag-and-drop file input
    ModelSelector.vue         # Model & quantization selector
    SessionList.vue           # Sidebar with session history
    StatusBar.vue             # Progress/status display during transcription
    TranscriptView.vue        # Word-level transcript with click-to-seek
  composables/
    useTranscriber.ts         # In-browser Worker communication & state
    useBackendTranscriber.ts  # GPU backend — fetch + SSE + same reactive interface
    useFileUpload.ts          # File validation + AudioContext decoding
    useAudioPlayer.ts         # Audio playback state
    useSessionStore.ts        # IndexedDB CRUD for session persistence
  utils/
    logger.ts                 # createLogger(tag) — console wrapper
    vadPipeline.ts            # VAD segment merging & audio slicing
    vadPipeline.test.ts       # Vitest unit tests
backend/
  main.py                     # FastAPI app — /api/info, /api/transcribe, static files
  models.py                   # Model registry (large-v3-turbo, large-v3, small, base)
  requirements.txt            # Python dependencies
  engine/
    __init__.py               # TranscriptionEngine ABC + TranscribeResult
    hardware.py               # Auto-detect Apple Silicon / CUDA / CPU
    factory.py                # Engine selection based on hardware
    mlx_whisper_engine.py     # MLX backend (Apple Silicon)
    faster_whisper_engine.py  # faster-whisper backend (NVIDIA / CPU)
tests/
  fast.spec.ts                # 26 Playwright tests with mock worker
  slow.spec.ts                # E2E test with real Whisper model
  backend.spec.ts             # 4 backend integration tests
  fixtures.ts                 # Mock worker & test utilities
```

### Pre-push Checklist

- [ ] `bun run build` passes (includes `vue-tsc` type-check)
- [ ] `bun run test` passes (fast tests)
- [ ] Backend tests pass if backend code changed: `bunx playwright test --project=backend`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Composition API, TypeScript 6 (strict) |
| Bundler | Vite 8 |
| In-browser ASR | Transformers.js v3 (ONNX Runtime WASM) |
| GPU backend | FastAPI + mlx-whisper / faster-whisper |
| VAD | Silero via @ricky0123/vad-web |
| Testing | Playwright (E2E) + Vitest (unit) |
| Persistence | IndexedDB via idb |

## License

[MIT](LICENSE)
