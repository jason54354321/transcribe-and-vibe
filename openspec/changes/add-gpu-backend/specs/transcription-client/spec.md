## ADDED Requirements

### Requirement: Upload audio to backend
The frontend SHALL upload the selected audio file to the backend `POST /api/transcribe` endpoint via `fetch` with multipart/form-data. The upload SHALL include the selected model ID and VAD toggle state as query parameters.

#### Scenario: Upload triggers backend transcription
- **WHEN** user selects an audio file and clicks transcribe (or auto-starts)
- **THEN** frontend uploads the audio file to `POST /api/transcribe?model={id}&vad={boolean}` and begins consuming the SSE response

### Requirement: Display streaming progress from backend
The frontend SHALL parse SSE events from the backend response and update the existing progress UI (StatusBar). The frontend SHALL map backend SSE events to the same reactive refs used by the current Worker-based flow (`status`, `progressInfo`, `isProcessing`).

#### Scenario: Progress updates from SSE
- **WHEN** backend streams SSE progress events
- **THEN** StatusBar displays the same progress UI as the current Worker flow (loading model, transcribing percentage, chunk progress)

#### Scenario: Backend unreachable
- **WHEN** frontend cannot connect to the backend (connection refused)
- **THEN** system displays an error: "Cannot connect to transcription backend. Is it running?"

### Requirement: Render backend transcript result
The frontend SHALL parse the final `result` SSE event and pass the transcript data to the existing TranscriptView and session storage. The result format SHALL be identical to the current Worker result, so TranscriptView requires no changes.

#### Scenario: Transcript rendered from backend result
- **WHEN** backend sends the final result SSE event
- **THEN** TranscriptView renders the transcript with word-level click-to-seek, identical to the current Worker-based flow

### Requirement: Backend connection health check
The frontend SHALL check backend availability on page load via `GET /api/info`. If unreachable, the frontend SHALL display a persistent warning banner.

#### Scenario: Backend available on load
- **WHEN** page loads and `GET /api/info` succeeds
- **THEN** no warning is shown, model/hardware info is displayed

#### Scenario: Backend unavailable on load
- **WHEN** page loads and `GET /api/info` fails
- **THEN** a warning banner is displayed: "Backend not running. Start it with: cd backend && python -m uvicorn main:app"
