## Purpose

Define the canonical requirements for audio transcription, including file intake, backend GPU transcription, model loading, progress reporting, and error handling.

## Requirements

### Requirement: Load audio file in browser
The system SHALL accept audio files via drag-and-drop or file picker in the browser. The system SHALL accept MP3, WAV, M4A, and OGG formats by checking the file's MIME type. The system SHALL reject files exceeding 100MB with a user-visible error message. The audio file SHALL be uploaded to the local backend for transcription (instead of remaining in browser memory only).

#### Scenario: Valid MP3 selected
- **WHEN** user selects a valid MP3 file under 100MB
- **THEN** system reads the file and uploads it to the backend `POST /api/transcribe` endpoint

#### Scenario: Unsupported format rejected
- **WHEN** user selects a .txt or .pdf file
- **THEN** system displays an error message: "Unsupported audio format. Accepted: mp3, wav, m4a, ogg"

#### Scenario: File too large
- **WHEN** user selects a 150MB audio file
- **THEN** system displays an error message: "File exceeds 100MB limit"

### Requirement: Word-level transcription via backend
The system SHALL transcribe audio using the local Python backend as the only supported transcription path. The backend SHALL run on the best available local compute hardware: Apple Silicon via mlx-whisper, NVIDIA via faster-whisper with CUDA, or CPU-only via faster-whisper on `device="cpu"`. The backend SHALL return word-level timestamps. The result format SHALL match the existing `{ text, chunks: [{ text, timestamp }] }` shape.

#### Scenario: Transcription produces word-level timestamps on CPU-only backend
- **WHEN** a valid English audio file is transcribed on a machine with no GPU acceleration available
- **THEN** the backend transcribes the file with its CPU execution path and returns `{ text: "...", chunks: [{ text: "Hello", timestamp: [0.00, 0.42] }, ...] }` where every chunk has `timestamp[0] < timestamp[1]` and chunks are in chronological order

#### Scenario: UI remains responsive during backend transcription
- **WHEN** a 10-minute audio file is being transcribed by the backend
- **THEN** the frontend UI remains fully interactive since transcription runs server-side regardless of whether the backend is using GPU or CPU hardware

### Requirement: Transcription progress reporting
The backend SHALL report progress to the frontend via SSE events during transcription. Progress events SHALL include: model loading status, transcription percentage, and chunk-level progress. The frontend SHALL display this progress identically to the previous Worker-based flow.

#### Scenario: Progress updates during long audio
- **WHEN** a 10-minute audio file is being transcribed
- **THEN** the frontend receives and displays SSE progress updates (e.g., "Loading model...", "Transcribing 45%...")

### Requirement: Transcription error handling
The system SHALL catch and report errors from the backend gracefully. The backend SHALL send an SSE error event with a descriptive message. The frontend SHALL display the error and return to the upload state. The system SHALL NOT crash on corrupted audio files.

#### Scenario: Corrupted audio file
- **WHEN** user selects a file with .mp3 extension but invalid audio content
- **THEN** backend sends an SSE error event, frontend displays "Failed to transcribe audio: [reason]" and returns to upload state

#### Scenario: Backend crash during transcription
- **WHEN** the backend process crashes during transcription
- **THEN** frontend detects connection loss and displays an error allowing retry
