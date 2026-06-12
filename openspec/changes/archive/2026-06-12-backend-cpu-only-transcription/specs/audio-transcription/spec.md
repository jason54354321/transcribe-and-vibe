## MODIFIED Requirements

### Requirement: Word-level transcription via backend
The system SHALL transcribe audio using the local Python backend as the only supported transcription path. The backend SHALL run on the best available local compute hardware: Apple Silicon via mlx-whisper, NVIDIA via faster-whisper with CUDA, or CPU-only via faster-whisper on `device="cpu"`. The backend SHALL return word-level timestamps. The result format SHALL match the existing `{ text, chunks: [{ text, timestamp }] }` shape.

#### Scenario: Transcription produces word-level timestamps on CPU-only backend
- **WHEN** a valid English audio file is transcribed on a machine with no GPU acceleration available
- **THEN** the backend transcribes the file with its CPU execution path and returns `{ text: "...", chunks: [{ text: "Hello", timestamp: [0.00, 0.42] }, ...] }` where every chunk has `timestamp[0] < timestamp[1]` and chunks are in chronological order

#### Scenario: UI remains responsive during backend transcription
- **WHEN** a 10-minute audio file is being transcribed by the backend
- **THEN** the frontend UI remains fully interactive since transcription runs server-side regardless of whether the backend is using GPU or CPU hardware

## REMOVED Requirements

### Requirement: Whisper model auto-download and caching
**Reason**: This requirement mixed backend model caching behavior into the end-user transcription flow. Backend-only execution remains covered by the API and model-registry capabilities, while this capability now focuses on the user-visible transcription contract.

**Migration**: Continue validating backend model download and cache behavior through `gpu-transcription-api` and `model-registry` requirements rather than `audio-transcription`.
