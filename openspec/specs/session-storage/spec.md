# session-storage Specification

## Purpose
TBD - created by archiving change add-sqlite-session-storage. Update Purpose after archive.
## Requirements
### Requirement: Persistent server-side session lifecycle
The system SHALL persist transcription sessions on the backend and provide operations to save, list, load, and delete sessions over REST so that session management is independent of any single browser's local storage.

#### Scenario: Save a completed transcription session
- **WHEN** a transcription completes and the client submits the session id, name, duration, optional transcription time, transcript, and audio
- **THEN** the backend stores the session and a subsequent listing includes that session

#### Scenario: List stored sessions newest first
- **WHEN** the client requests the list of sessions
- **THEN** the backend returns session metadata (id, name, createdAt, durationSec, transcriptionTimeSec) ordered with the most recently created session first and without transcript or audio payloads

#### Scenario: Delete a stored session
- **WHEN** the client deletes a session by id
- **THEN** the backend removes it and it no longer appears in the session listing

### Requirement: Audio, transcript, and metadata persistence in SQLite
The system SHALL persist each session's audio bytes, transcript, and metadata in a SQLite database, and SHALL serve the stored transcript and audio on demand so audio plays back without being held in client memory.

#### Scenario: Retrieve a stored transcript
- **WHEN** the client requests a session by id that exists
- **THEN** the backend returns the session metadata together with its stored transcript

#### Scenario: Stream stored audio for playback
- **WHEN** the client requests the audio for a stored session by id
- **THEN** the backend returns the original audio bytes with the stored audio MIME type

#### Scenario: Request a missing session
- **WHEN** the client requests a session or its audio for an id that does not exist
- **THEN** the backend responds with a not-found status rather than returning data

### Requirement: Session retrieval after reload
The system SHALL retain stored sessions across client reloads so that previously saved sessions remain available for listing, loading, and playback after the application is reopened.

#### Scenario: Sessions survive a page reload
- **WHEN** the user reloads the application after sessions have been saved
- **THEN** the previously saved sessions are listed and can be selected to view their transcript and play their audio

#### Scenario: Saved session reloads with original metadata
- **WHEN** the user selects a stored session after a reload
- **THEN** the session's name, duration, and transcription time are restored from the backend store

