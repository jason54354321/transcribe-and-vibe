## Why

Vibe 現在的產品承諾仍是 dual-mode：後端可用時走後端，不可用時退回前端 Web Worker。這讓轉錄路徑、模型選擇、錯誤處理與測試基礎設施都必須同時維護兩套行為；既然後端已經支援 CPU 模式，現在適合把產品收斂成單一路徑，讓所有轉錄都統一透過後端處理。

## What Changes

- Remove the in-browser Whisper transcription path from the frontend so selected audio is always sent to the backend transcription API.
- Remove frontend-only transcription concerns from the user flow, including Worker-based fallback, ONNX model selection, and browser-side ASR status assumptions.
- Redefine backend availability handling: if the backend is unreachable, the app shows a clear blocking error or warning instead of silently falling back to browser transcription.
- Keep backend-side fallback to CPU as a first-class execution path when Apple Silicon MLX or NVIDIA CUDA are unavailable, with explicit model defaults and user-facing expectations for slower inference.
- Add a transcription info area in the UI that shows the detected architecture, the active model, and the current execution backend (CUDA / MLX / CPU) for the current session.
- Preserve the current transcript result shape, progress UI, session flow, and playback interactions by keeping the backend SSE path as the single transcription contract.
- **BREAKING**: Offline/in-browser transcription is removed. Transcription now requires a reachable backend service even on machines without GPU hardware.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `audio-transcription`: Change the canonical transcription path to backend-only execution and remove the in-browser fallback behavior.
- `transcription-client`: Update frontend requirements so health-check, upload, progress, error states, and the transcription info area all assume a single backend transcription path.
- `hardware-detection`: Clarify backend hardware selection and automatic CPU fallback behavior when GPU acceleration is unavailable.
- `model-registry`: Tighten default-model requirements for CPU-backed transcription so backend defaults remain usable without GPU acceleration.
- `gpu-transcription-api`: Preserve the same API surface while updating expectations to cover backend-only transcription on both GPU and CPU hardware.

## Impact

- **Frontend**: `App.vue`, mode-selection logic, `useTranscriber.ts`, `worker.ts`, `models.ts`, upload flow, warning/error UX, and tests that currently assume Worker fallback.
- **Backend**: CPU fallback behavior, runtime metadata, and model-default behavior become product-critical rather than incidental.
- **Specs/tests**: Existing OpenSpec capabilities and Playwright coverage need to reflect backend-only behavior and the absence of browser/offline transcription.
- **User experience**: Backend startup becomes a hard requirement; users need clear messaging when the backend is unavailable and visible runtime info about architecture, model, and CUDA/MLX/CPU execution mode during transcription.
