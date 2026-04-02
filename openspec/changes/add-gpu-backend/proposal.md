## Why

Vibe currently runs Whisper ASR entirely in the browser via Web Worker + ONNX. This limits model choice to small quantized Whisper variants (~7-8% WER), and inference on CPU takes ~125s for 3.5 min audio. Moving transcription to a local Python backend with GPU acceleration (NVIDIA CUDA / Apple MLX) would unlock larger, more accurate models (~5-7% WER) with 5-50x faster inference while simplifying the frontend into a thin client.

## What Changes

- Add a Python (FastAPI) backend in `backend/` that handles audio transcription via GPU-accelerated ASR
- Auto-detect hardware: Apple Silicon → MLX-Whisper, NVIDIA GPU → faster-whisper (CTranslate2 + CUDA), no GPU → CPU fallback
- Support multiple ASR models: Whisper turbo/large-v3, Distil-Whisper large-v3.5, with extensible model registry
- Provide word-level timestamps via cross-attention DTW (built-in) or optional forced alignment (WhisperX / ctc-forced-aligner)
- Add REST API endpoint for transcription with streaming progress via SSE or WebSocket
- Convert the frontend into a thin client that uploads audio to the local backend, displays streaming progress, and renders transcript playback UI
- **Monorepo structure**: `frontend/` (existing Vue app) + `backend/` (new Python service)
- **BREAKING**: Transcription moves from in-browser inference to backend-only inference

## Capabilities

### New Capabilities

- `gpu-transcription-api`: FastAPI REST endpoint accepting audio, returning transcription with timestamps. Handles model loading, hardware detection, and inference orchestration.
- `hardware-detection`: Auto-detect available compute (Apple Silicon / NVIDIA CUDA / CPU-only) and select optimal ASR engine + model accordingly.
- `model-registry`: Extensible configuration for ASR models — maps model ID to engine (mlx-whisper / faster-whisper / whisper.cpp), quantization, expected VRAM, and supported features.
- `forced-alignment`: Optional post-processing step to improve word-level timestamp accuracy beyond Whisper's built-in DTW (via WhisperX wav2vec2 or ctc-forced-aligner MMS-300M).
- `transcription-client`: Frontend client flow for uploading audio to the backend, receiving streaming progress, and rendering the returned transcript and timestamps.

### Modified Capabilities

- `audio-transcription`: Change the transcription architecture from in-browser Web Worker inference to backend-served inference while preserving the user-facing transcription workflow.

## Impact

- **New directory**: `backend/` with Python project (FastAPI, uvicorn, model dependencies)
- **New dependencies**: `faster-whisper`, `mlx-whisper` (optional, Mac only), `ctc-forced-aligner` (optional), FastAPI, uvicorn
- **Frontend changes**: replace direct Worker transcription flow with backend API communication; add a new composable such as `useBackendTranscriber.ts`
- **DevOps**: Docker Compose for one-command startup; backend serves built frontend in production
- **Disk**: Models cached in `~/.cache/huggingface/` (0.8-3.1 GB per model)
- **VRAM**: 1.5-4.5 GB depending on model selection
- **Architecture change**: the frontend no longer runs ASR models locally; transcription requires the local backend service
