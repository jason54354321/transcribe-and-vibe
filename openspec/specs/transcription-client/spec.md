## Purpose

Define the canonical requirements for the frontend transcription client that communicates with the GPU backend, including audio upload, SSE progress streaming, result rendering, and connection health checks.

## Requirements

### Requirement: Upload audio to backend
The frontend SHALL upload the selected audio file to the backend `POST /api/transcribe` endpoint via `fetch` with multipart/form-data. The upload SHALL include the selected model ID as a query parameter. The frontend SHALL NOT attempt browser-side transcription when the backend is unreachable.

#### Scenario: Upload triggers backend transcription
- **WHEN** user selects an audio file and starts transcription
- **THEN** frontend uploads the audio file to `POST /api/transcribe?model={id}` using the current backend transcription settings and begins consuming the SSE response

#### Scenario: Backend unavailable at transcription time
- **WHEN** user starts transcription while the backend is unreachable
- **THEN** the frontend displays a blocking error explaining that transcription requires the backend service and does not start a browser-side fallback path

### Requirement: Display streaming progress from backend
The frontend SHALL parse SSE events from the backend response and update the existing progress UI (StatusBar). The frontend SHALL map backend SSE events to the same reactive refs used by the current Worker-based flow (`status`, `progressInfo`, `isProcessing`, `modelInfo`).

#### Scenario: Progress updates from SSE
- **WHEN** backend streams SSE progress events
- **THEN** StatusBar displays the same progress UI as the current Worker flow and updates the runtime info area from backend-provided `model-info` metadata rather than frontend inference

#### Scenario: Backend unreachable
- **WHEN** frontend cannot connect to the backend (connection refused)
- **THEN** system displays an error explaining that transcription requires the backend service to be running

### Requirement: Render backend transcript result
The frontend SHALL parse the final `result` SSE event and pass the transcript data to the existing TranscriptView and session storage. The result format SHALL remain compatible with the current Worker result, while preserving backend-provided `model` and `dtype` metadata so the current session's model badge reflects the actual backend execution.

#### Scenario: Transcript rendered from backend result
- **WHEN** backend sends the final result SSE event
- **THEN** TranscriptView renders the transcript with word-level click-to-seek, identical to the current Worker-based flow, and the current session retains the backend-reported model and precision in the status UI

### Requirement: Backend connection health check
The frontend SHALL check backend availability on page load via `GET /api/info`. If unreachable, the frontend SHALL display a persistent warning or error banner stating that backend transcription is unavailable until the backend starts.

#### Scenario: Backend available on load
- **WHEN** page loads and `GET /api/info` succeeds
- **THEN** no backend-unavailable warning is shown and the frontend uses backend transcription as its only available mode

#### Scenario: Backend unavailable on load
- **WHEN** page loads and `GET /api/info` fails
- **THEN** a persistent warning or error banner is displayed explaining that transcription requires the backend service and how to start it

### Requirement: Transcription screen shows backend runtime info
The transcription screen SHALL display an info area for the current transcription session. The info area SHALL show the detected architecture, the active model, and the current execution backend used by the backend runtime (`CUDA`, `MLX`, or `CPU`). The displayed values SHALL come from backend metadata rather than frontend inference.

#### Scenario: Runtime info shown for GPU-backed session
- **WHEN** backend metadata indicates an Apple Silicon or NVIDIA-backed transcription session
- **THEN** the transcription screen shows the architecture, the active model, and `MLX` or `CUDA` as the current execution backend

#### Scenario: Runtime info shown for CPU fallback session
- **WHEN** backend metadata indicates the transcription is running through CPU fallback
- **THEN** the transcription screen shows the detected architecture, the active model, and `CPU` as the current execution backend
