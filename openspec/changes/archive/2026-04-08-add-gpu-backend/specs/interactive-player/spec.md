## MODIFIED Requirements

### Requirement: Drag-and-drop audio upload
The system SHALL provide a drag-and-drop zone on the main page for selecting audio files. The system SHALL also provide a file picker button as fallback. The drop zone SHALL display visual feedback (highlight) when a file is dragged over it. Upon file selection, the system SHALL upload the audio to the backend and begin transcription.

#### Scenario: Drag MP3 onto drop zone
- **WHEN** user drags an MP3 file onto the drop zone area
- **THEN** drop zone shows visual highlight during dragover, and upon drop the audio is uploaded to the backend for transcription

#### Scenario: Click to select file
- **WHEN** user clicks the file picker button and selects an audio file
- **THEN** audio is uploaded to the backend and transcription begins

#### Scenario: Non-audio file dropped
- **WHEN** user drops a non-audio file (e.g., .pdf) onto the drop zone
- **THEN** system shows an error message indicating only audio files are accepted

### Requirement: Transcription progress indication
The system SHALL show a loading/progress indicator while audio is being transcribed by the backend. The indicator SHALL clearly communicate that processing is in progress and SHALL display status messages from the backend SSE stream (e.g., "Loading model...", "Transcribing 45%...").

#### Scenario: Long transcription in progress
- **WHEN** user selects a 10-minute audio file and the backend is processing
- **THEN** a visible loading indicator with status text is displayed, updated from SSE events

#### Scenario: Transcription completes
- **WHEN** the backend sends the final result SSE event
- **THEN** loading indicator is removed and the transcript is rendered

## REMOVED Requirements

### Requirement: Static self-contained frontend
**Reason**: The application now requires a Python backend for transcription. It is no longer a static two-file app.
**Migration**: Use `docker compose up` or `cd backend && uvicorn main:app` + `cd frontend && npm run dev` for development. Production: backend serves built frontend via FastAPI StaticFiles.
