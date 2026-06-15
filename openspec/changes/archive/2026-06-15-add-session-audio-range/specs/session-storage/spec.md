## MODIFIED Requirements

### Requirement: Audio, transcript, and metadata persistence in SQLite
The system SHALL persist each session's audio bytes, transcript, and metadata in a SQLite database, and SHALL serve the stored transcript and audio on demand so audio plays back without being held in client memory. The stored-audio endpoint SHALL honor HTTP range requests: it SHALL advertise `Accept-Ranges: bytes`, return `206 Partial Content` with a `Content-Range` header for a satisfiable `Range` request, return the full `200` body when no `Range` header is present, and return `416 Range Not Satisfiable` when the requested start is at or beyond the total audio length. Range support SHALL allow click-to-seek to work while playing a stored session's audio.

#### Scenario: Retrieve a stored transcript
- **WHEN** the client requests a session by id that exists
- **THEN** the backend returns the session metadata together with its stored transcript

#### Scenario: Stream stored audio for playback
- **WHEN** the client requests the audio for a stored session by id without a range header
- **THEN** the backend returns the original audio bytes with `200 OK`, the stored audio MIME type, and an `Accept-Ranges: bytes` header

#### Scenario: Serve a byte range for seeking
- **WHEN** the client requests stored session audio with a `Range: bytes=START-END` header that lies within the audio length
- **THEN** the backend responds with `206 Partial Content`, the requested byte range as the body, and a `Content-Range: bytes START-END/TOTAL` header

#### Scenario: Range beyond end of audio
- **WHEN** the client requests stored session audio with a `Range` whose start is at or beyond the total audio length
- **THEN** the backend responds with `416 Range Not Satisfiable` and a `Content-Range: bytes */TOTAL` header

#### Scenario: Request a missing session
- **WHEN** the client requests a session or its audio for an id that does not exist
- **THEN** the backend responds with a not-found status rather than returning data
