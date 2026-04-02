## Context

Vibe is a Vue 3 + Vite audio transcription app that currently runs Whisper ASR entirely in-browser via a Web Worker + ONNX Runtime. This limits model choice to small quantized variants (~7-8% WER) with slow CPU inference (~125s for 3.5min audio).

The codebase uses TypeScript strict mode, Vue 3 Composition API (`<script setup>`), and follows conventions documented in `AGENTS.md`. The frontend communicates with the Worker via a thin `postMessage`-based protocol defined in `useTranscriber.ts`.

Key constraint: the user runs Apple M4 with 16GB unified memory. The backend must work on Mac (MLX) and also support NVIDIA CUDA for other machines.

## Goals / Non-Goals

**Goals:**
- Add a FastAPI backend that performs GPU-accelerated ASR transcription
- Auto-detect hardware (Apple Silicon / NVIDIA / CPU) and pick optimal engine
- Preserve the existing frontend UX: drag-drop → progress → word-level transcript → click-to-seek
- Keep the result format identical (`{ text, chunks: [{ text, timestamp }] }`) so TranscriptView needs no changes
- Monorepo structure: `frontend/` + `backend/` in one repo

**Non-Goals:**
- Remote/cloud deployment (this is a local-first tool)
- Multi-user / authentication
- Forced alignment in v1 (built-in Whisper DTW is sufficient to start)
- Docker in v1 (direct `uvicorn` start is sufficient for local use)
- Removing the existing browser-based Worker code (keep it for potential future offline mode)

## Decisions

### D1: FastAPI + SSE for backend API
**Choice**: FastAPI with Server-Sent Events for progress streaming.
**Alternatives considered**: WebSocket (bidirectional not needed), Flask (no async), gRPC (overkill for local).
**Rationale**: FastAPI's native async + SSE via `StreamingResponse` is the simplest approach. Single POST endpoint returns SSE stream. No WebSocket connection management needed.

### D2: Engine selection — mlx-whisper on Mac, faster-whisper on NVIDIA/CPU
**Choice**: Two engines behind a common interface.
**Alternatives considered**: whisper.cpp (good but no Python API), openai-whisper (slow, no CTranslate2), insanely-fast-whisper (wrapper around transformers, less mature).
**Rationale**: mlx-whisper is the fastest option on Apple Silicon (native Metal acceleration). faster-whisper (CTranslate2) is the most mature option for CUDA with int8 quantization. Both expose similar Python APIs, making a common wrapper feasible.

### D3: Common transcription interface
**Choice**: Python abstract base class `TranscriptionEngine` with `transcribe(audio_path, model, vad, on_progress)` method. Concrete implementations: `MlxWhisperEngine`, `FasterWhisperEngine`.
**Rationale**: Decouples API layer from engine specifics. Adding new engines (e.g., Whisper.cpp, NeMo) requires only a new class.

### D4: VAD handling — engine-native
**Choice**: Use each engine's built-in VAD support rather than a separate VAD step.
**Alternatives considered**: Separate Silero VAD preprocessing (current browser approach).
**Rationale**: faster-whisper has built-in Silero VAD (`vad_filter=True`). mlx-whisper processes audio in chunks natively. Avoids duplicating VAD logic.

### D5: Model defaults — large-v3-turbo
**Choice**: Default to `large-v3-turbo` on all hardware with GPU. Fall back to `base` on CPU-only.
**Rationale**: large-v3-turbo offers best speed/accuracy tradeoff (~7.83% WER, 4-layer decoder, ~1.5GB VRAM). The user's M4 16GB can easily fit it.

### D6: Frontend integration — new composable, minimal App.vue changes
**Choice**: Create `useBackendTranscriber.ts` composable that exposes the same reactive interface as `useTranscriber.ts` (status, transcript, isProcessing, error, transcribe). App.vue switches from `useTranscriber` to `useBackendTranscriber` with minimal template changes.
**Rationale**: Same reactive interface means StatusBar, TranscriptView, and session logic work unchanged. Only the data source changes.

### D7: Monorepo layout
**Choice**: Move existing Vue app into `frontend/` and add `backend/` at repo root.
**Rationale**: Standard monorepo pattern. Both services start from repo root.

## Risks / Trade-offs

- **[MLX-only on Mac]** → mlx-whisper cannot run on non-Apple hardware. Mitigation: faster-whisper works everywhere as fallback.
- **[Model download size]** → large-v3-turbo is ~1.5GB first download. Mitigation: progress reporting via SSE; cached after first download.
- **[Breaking change]** → Frontend can no longer transcribe without backend running. Mitigation: clear error message with startup instructions; keep Worker code for potential future offline mode.
- **[Two Python ML frameworks]** → MLX + CTranslate2 are different ecosystems. Mitigation: abstract engine interface isolates the difference.

## Open Questions

- Should we add Docker Compose in v1 or defer to v2?
- Should forced alignment (WhisperX/ctc-forced-aligner) be a v1 feature or post-MVP?
