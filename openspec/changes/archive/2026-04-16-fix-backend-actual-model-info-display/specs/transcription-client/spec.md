## MODIFIED Requirements

### Requirement: Upload audio to backend
The frontend SHALL upload the selected audio file to the backend `POST /api/transcribe` endpoint via `fetch` with multipart/form-data. The upload SHALL include the selected model ID and VAD toggle state as query parameters.

#### Scenario: Upload triggers backend transcription
- **WHEN** user selects an audio file and clicks transcribe (or auto-starts)
- **THEN** frontend uploads the audio file to `POST /api/transcribe?model={id}&vad={boolean}` using the currently selected backend model and begins consuming the SSE response

### Requirement: Display streaming progress from backend
The frontend SHALL parse SSE events from the backend response and update the existing progress UI (StatusBar). The frontend SHALL map backend SSE events to the same reactive refs used by the current Worker-based flow (`status`, `progressInfo`, `isProcessing`, `modelInfo`).

#### Scenario: Progress updates from SSE
- **WHEN** backend streams SSE progress events
- **THEN** StatusBar displays the same progress UI as the current Worker flow and updates the model badge from backend-provided `model-info` metadata rather than worker defaults

#### Scenario: Backend unreachable
- **WHEN** frontend cannot connect to the backend (connection refused)
- **THEN** system displays an error: "Cannot connect to transcription backend. Is it running?"

### Requirement: Render backend transcript result
The frontend SHALL parse the final `result` SSE event and pass the transcript data to the existing TranscriptView and session storage. The result format SHALL remain compatible with the current Worker result, while preserving backend-provided `model` and `dtype` metadata so the current session's model badge reflects the actual backend execution.

#### Scenario: Transcript rendered from backend result
- **WHEN** backend sends the final result SSE event
- **THEN** TranscriptView renders the transcript with word-level click-to-seek, identical to the current Worker-based flow, and the current session retains the backend-reported model and precision in the status UI
