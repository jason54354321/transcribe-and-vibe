## MODIFIED Requirements

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
The system SHALL transcribe audio using the local Python backend with GPU-accelerated ASR (faster-whisper or mlx-whisper). The backend SHALL use VAD preprocessing (Silero) to segment audio before transcription. The backend SHALL return word-level timestamps. The result format SHALL match the existing `{ text, chunks: [{ text, timestamp }] }` shape.

#### Scenario: Transcription produces word-level timestamps
- **WHEN** a valid English audio file is transcribed via the backend
- **THEN** the backend returns a result containing `{ text: "...", chunks: [{ text: "Hello", timestamp: [0.00, 0.42] }, ...] }` where every chunk has `timestamp[0] < timestamp[1]` and chunks are in chronological order

#### Scenario: UI remains responsive during transcription
- **WHEN** a 10-minute audio file is being transcribed by the backend
- **THEN** the frontend UI remains fully interactive since transcription runs server-side

### Requirement: Whisper model auto-download and caching
The system SHALL download Whisper models from HuggingFace Hub on first use via the backend's ASR engine. Models SHALL be cached in `~/.cache/huggingface/` for subsequent uses. The system SHALL report download progress to the frontend via SSE.

#### Scenario: First use with no cached model
- **WHEN** backend receives first transcription request and model is not cached
- **THEN** model is downloaded with progress streamed to the frontend, then transcription begins

#### Scenario: Subsequent use with cached model
- **WHEN** backend receives a transcription request and model is already cached
- **THEN** no download occurs, model loads from cache, and transcription begins immediately

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

## REMOVED Requirements

### Requirement: Language auto-detection
**Reason**: Language auto-detection is a Whisper built-in feature that will be preserved by the backend ASR engine automatically. It does not need a separate requirement — it is implicit in the backend transcription pipeline.
**Migration**: No action needed. Backend ASR engines auto-detect language by default.
