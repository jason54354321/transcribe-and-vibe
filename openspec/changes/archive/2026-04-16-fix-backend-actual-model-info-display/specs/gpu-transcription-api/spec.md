## MODIFIED Requirements

### Requirement: SSE progress streaming
The system SHALL stream transcription progress to the client via Server-Sent Events on the same `POST /api/transcribe` response. Progress events SHALL include: `model-loading`, `model-info` (with the actual model ID and runtime precision selected for the active transcription job), `transcribing` (with percentage), `transcription-progress` (chunk-level), and `result` (final transcript). The SSE stream SHALL close after the result event.

#### Scenario: Progress events during transcription
- **WHEN** a 3-minute audio file is being transcribed
- **THEN** client receives SSE events in order: `model-loading` → `model-info` → `transcribing` (0-100%) → `result` with final transcript JSON

### Requirement: Transcription result format
The system SHALL return results in the same JSON shape as the existing Worker protocol, while also including backend execution metadata: `{ text: string, chunks: Array<{ text: string, timestamp: [number, number] }>, model: string, dtype: string }`. Timestamps SHALL be in seconds. Word-level timestamps SHALL be provided when available. The `model` and `dtype` fields SHALL describe the actual backend model ID and runtime precision used for that transcription job.

#### Scenario: Result matches existing format with backend metadata
- **WHEN** transcription completes for an English audio file
- **THEN** result JSON contains `text` (full transcript), `chunks` array with word-level entries and `timestamp: [start, end]` in seconds, plus `model` and `dtype` describing the actual backend execution
