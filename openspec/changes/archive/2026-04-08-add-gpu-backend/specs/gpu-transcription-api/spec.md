## ADDED Requirements

### Requirement: Audio upload endpoint
The system SHALL expose a `POST /api/transcribe` endpoint that accepts audio via multipart/form-data. The endpoint SHALL accept the same formats as the frontend (MP3, WAV, M4A, OGG). The endpoint SHALL reject files exceeding 100MB with HTTP 413. The endpoint SHALL return an SSE stream for progress and results.

#### Scenario: Upload valid audio
- **WHEN** client sends a valid MP3 file via `POST /api/transcribe`
- **THEN** server accepts the upload and begins streaming SSE events (progress, then result)

#### Scenario: Upload oversized file
- **WHEN** client sends a 150MB audio file
- **THEN** server responds with HTTP 413 and a JSON error body `{ "error": "File exceeds 100MB limit" }`

#### Scenario: Upload unsupported format
- **WHEN** client sends a .txt file
- **THEN** server responds with HTTP 400 and a JSON error body `{ "error": "Unsupported audio format" }`

### Requirement: SSE progress streaming
The system SHALL stream transcription progress to the client via Server-Sent Events on the same `POST /api/transcribe` response. Progress events SHALL include: `model-loading`, `transcribing` (with percentage), `transcription-progress` (chunk-level), and `result` (final transcript). The SSE stream SHALL close after the result event.

#### Scenario: Progress events during transcription
- **WHEN** a 3-minute audio file is being transcribed
- **THEN** client receives SSE events in order: `model-loading` → `transcribing` (0-100%) → `result` with final transcript JSON

#### Scenario: Error during transcription
- **WHEN** transcription fails mid-stream (e.g., corrupted audio)
- **THEN** server sends an SSE `error` event with message and closes the stream

### Requirement: Transcription result format
The system SHALL return results in the same JSON shape as the existing Worker protocol: `{ text: string, chunks: Array<{ text: string, timestamp: [number, number] }> }`. Timestamps SHALL be in seconds. Word-level timestamps SHALL be provided when available.

#### Scenario: Result matches existing format
- **WHEN** transcription completes for an English audio file
- **THEN** result JSON contains `text` (full transcript) and `chunks` array with word-level entries, each having `text` and `timestamp: [start, end]` in seconds

### Requirement: Model selection via query parameters
The system SHALL accept an optional `model` query parameter (model ID from registry). If `model` is omitted, the system SHALL use the default model for the detected hardware. Engine-supported VAD behavior is applied automatically and is not user-configurable.

#### Scenario: Explicit model selection
- **WHEN** client sends `POST /api/transcribe?model=large-v3-turbo`
- **THEN** server uses the specified model while keeping engine-supported VAD behavior automatic

#### Scenario: Default model selection
- **WHEN** client sends `POST /api/transcribe` without model parameter
- **THEN** server uses the default model configured for the detected hardware
