## 1. Monorepo Restructure

- [x] 1.1 ~~Move existing Vue app files into `frontend/`~~ DEFERRED — keep frontend at repo root, add `backend/` alongside. Less disruptive; can restructure later.

## 2. Backend Project Setup

- [x] 2.1 Create `backend/` directory with Python project structure: `main.py`, `engine/`, `models.py`, `requirements.txt`
- [x] 2.2 Define `requirements.txt` with FastAPI, uvicorn, faster-whisper, mlx-whisper (optional Mac dep)
- [x] 2.3 Implement hardware detection module (`engine/hardware.py`): detect Apple Silicon (MLX), NVIDIA CUDA, or CPU-only
- [x] 2.4 Implement model registry (`models.py`): model ID → engine, HF model ID, quantization, VRAM estimate

## 3. Transcription Engine

- [x] 3.1 Define abstract `TranscriptionEngine` interface with `transcribe(audio_path, model_id, use_vad, on_progress)` method
- [x] 3.2 Implement `FasterWhisperEngine` — load model, transcribe with `word_timestamps=True`, `vad_filter` toggle, emit progress callbacks
- [x] 3.3 Implement `MlxWhisperEngine` — load model via mlx-whisper, transcribe with word timestamps, emit progress callbacks
- [x] 3.4 Implement engine factory that selects engine based on detected hardware

## 4. FastAPI Endpoints

- [x] 4.1 Implement `POST /api/transcribe` — accept multipart audio, validate format/size, stream SSE progress events, return result
- [x] 4.2 Implement `GET /api/info` — return hardware, engine, loaded model, available models
- [x] 4.3 Implement SSE event format: `model-loading`, `transcribing` (percentage), `result` (JSON), `error`
- [x] 4.4 Add CORS middleware for local frontend dev (localhost:5173 → localhost:8000)

## 5. Frontend Client Integration

- [x] 5.1 Create `src/composables/useBackendTranscriber.ts` — upload audio via fetch, parse SSE stream, update reactive refs (status, transcript, isProcessing, error, progressInfo)
- [x] 5.2 Update `src/App.vue` — replace `useTranscriber` with `useBackendTranscriber`, add backend health check on mount, show warning banner if backend unreachable
- [x] 5.3 Update `src/components/StatusBar.vue` if SSE event names differ from Worker protocol
- [x] 5.4 Verify TranscriptView, AudioPlayer, SessionList work unchanged with backend results

## 6. Verification

- [x] 6.1 `bun run build` passes (vue-tsc + vite build)
- [x] 6.2 Backend starts: `cd backend && pip install -r requirements.txt && uvicorn main:app`
- [x] 6.3 End-to-end test: upload audio in browser → backend transcribes → transcript renders with click-to-seek
- [x] 6.4 Test hardware detection on current machine (Apple M4)
