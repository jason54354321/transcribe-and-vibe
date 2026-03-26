## ADDED Requirements

### Requirement: Load audio file in browser
The system SHALL accept audio files via drag-and-drop or file picker in the browser. The system SHALL accept MP3, WAV, M4A, and OGG formats by checking the file's MIME type. The system SHALL reject files exceeding 100MB with a user-visible error message. The audio file SHALL remain in browser memory (no server upload).

#### Scenario: Valid MP3 selected
- **WHEN** user selects a valid MP3 file under 100MB
- **THEN** system reads the file into memory and begins transcription in a Web Worker

#### Scenario: Unsupported format rejected
- **WHEN** user selects a .txt or .pdf file
- **THEN** system displays an error message: "Unsupported audio format. Accepted: mp3, wav, m4a, ogg"

#### Scenario: File too large
- **WHEN** user selects a 150MB audio file
- **THEN** system displays an error message: "File exceeds 100MB limit"

### Requirement: Word-level transcription via Web Worker
The system SHALL transcribe audio using transformers.js with the Whisper model inside a Web Worker, to avoid blocking the main UI thread. The Worker SHALL use the `pipeline('automatic-speech-recognition', ...)` API with `return_timestamps: 'word'` and `chunk_length_s: 30`. The Worker SHALL post the transcription result back to the main thread upon completion.

#### Scenario: Transcription produces word-level timestamps
- **WHEN** a valid English audio file is transcribed
- **THEN** the Worker posts a result containing `{ text: "...", chunks: [{ text: "Hello", timestamp: [0.00, 0.42] }, ...] }` where every chunk has `timestamp[0] < timestamp[1]` and chunks are in chronological order

#### Scenario: UI remains responsive during transcription
- **WHEN** a 10-minute audio file is being transcribed in the Web Worker
- **THEN** the main thread UI (drop zone, progress indicator) remains fully interactive and does not freeze

### Requirement: Whisper model auto-download and caching
The system SHALL use the Whisper `base` model (`onnx-community/whisper-base`) by default. The model SHALL be automatically downloaded from HuggingFace Hub on first use via transformers.js. The model SHALL be cached in the browser's IndexedDB/Cache API for subsequent uses. The system SHALL display download progress to the user.

#### Scenario: First use with no cached model
- **WHEN** user triggers transcription for the first time and no model is cached
- **THEN** the model is downloaded with visible progress indication, then transcription begins

#### Scenario: Subsequent use with cached model
- **WHEN** user triggers transcription and the model is already cached in IndexedDB
- **THEN** no download occurs, model loads from cache, and transcription begins immediately

### Requirement: Transcription progress reporting
The Web Worker SHALL report progress back to the main thread during transcription. Progress messages SHALL include at minimum: model loading status, and transcription in-progress status. The main thread SHALL display this progress to the user.

#### Scenario: Progress updates during long audio
- **WHEN** a 10-minute audio file is being transcribed
- **THEN** the main thread receives and displays progress updates (e.g., "Loading model...", "Transcribing...")

### Requirement: Transcription error handling
The system SHALL catch and report errors from the Web Worker gracefully. The system SHALL NOT crash or hang on corrupted audio files. Error messages SHALL be displayed to the user in the UI.

#### Scenario: Corrupted audio file
- **WHEN** user selects a file with .mp3 extension but invalid audio content
- **THEN** system displays an error message: "Failed to transcribe audio: [reason]" and returns to the upload state

#### Scenario: Worker crash
- **WHEN** the Web Worker crashes during transcription
- **THEN** system displays an error message and allows the user to try again

### Requirement: Language auto-detection
The system SHALL auto-detect the spoken language via Whisper's built-in language detection. The detected language SHALL be displayed to the user after transcription completes.

#### Scenario: English audio detected
- **WHEN** an English MP3 is transcribed
- **THEN** detected language "English" is displayed in the UI

#### Scenario: Non-English audio
- **WHEN** a Mandarin MP3 is transcribed
- **THEN** detected language "Chinese" is displayed, and words are transcribed in the detected language
