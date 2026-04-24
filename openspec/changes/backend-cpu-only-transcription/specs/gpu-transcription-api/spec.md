## MODIFIED Requirements

### Requirement: SSE progress streaming
The system SHALL stream transcription progress to the client via Server-Sent Events on the same `POST /api/transcribe` response. Progress events SHALL include `model-loading`, `model-info` (with the actual model ID, detected architecture, and runtime backend selected for the active transcription job), `transcribing` (with percentage), `transcription-progress` (chunk-level), and `result` (final transcript). The SSE stream SHALL close after the result event. This event contract SHALL remain the same whether the backend is running on Apple Silicon, NVIDIA GPU, or CPU fallback hardware.

#### Scenario: Progress events during CPU transcription
- **WHEN** a 3-minute audio file is being transcribed on a CPU-only backend
- **THEN** client receives SSE events in order such as `model-loading` → `model-info` → `transcribing` (0-100%) → `transcription-progress` (0 / N … N / N chunks) → `result` with final transcript JSON

#### Scenario: Error during transcription
- **WHEN** transcription fails mid-stream (e.g., corrupted audio)
- **THEN** server sends an SSE `error` event with message and closes the stream

## ADDED Requirements

### Requirement: Runtime metadata identifies actual execution backend
The backend SHALL expose runtime metadata for each transcription session that identifies the detected architecture, active model, and actual execution backend used for the job (`CUDA`, `MLX`, or `CPU`). This metadata SHALL be stable enough for the frontend to render the transcription info area without guessing from local state.

#### Scenario: Metadata indicates MLX execution
- **WHEN** a transcription runs on Apple Silicon through mlx-whisper
- **THEN** backend metadata identifies the detected architecture, the active model, and `MLX` as the execution backend for that session

#### Scenario: Metadata indicates CPU fallback execution
- **WHEN** a transcription runs because the backend fell back to CPU execution
- **THEN** backend metadata identifies the detected architecture, the active model, and `CPU` as the execution backend for that session

### Requirement: Model and VAD selection via query parameters
The system SHALL accept optional query parameters `model` (model ID from registry) and `vad` (boolean, default true). If `model` is omitted, the system SHALL use the default model configured for the detected hardware, including CPU-safe defaults on CPU-only machines. If `vad=false`, the system SHALL skip VAD preprocessing.

#### Scenario: Explicit model selection
- **WHEN** client sends `POST /api/transcribe?model=large-v3-turbo&vad=false`
- **THEN** server uses the specified model without VAD preprocessing when that model is valid for the running backend

#### Scenario: Default model selection on CPU-only backend
- **WHEN** client sends `POST /api/transcribe` without model parameter to a CPU-only backend
- **THEN** server uses the CPU-safe default model configured for that hardware instead of a GPU-oriented large default
