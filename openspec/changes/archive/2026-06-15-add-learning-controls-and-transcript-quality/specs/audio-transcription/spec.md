## ADDED Requirements

### Requirement: Hallucination filtering before persistence
The backend SHALL remove hallucinated word runs from the transcription result before it is persisted or returned, detecting them by local word density (words per second) rather than by repetition, so that contiguous runs whose timestamps imply a superhuman speaking rate are dropped while emphatic speech and song lyrics that repeat at human pace are preserved. Chunks without a numeric start timestamp SHALL be kept unchanged.

#### Scenario: Superhuman-density run removed
- **WHEN** the transcription result contains a contiguous run of words whose timestamps collapse into an impossible speaking rate (e.g. hundreds of words within a one-second window)
- **THEN** the backend drops that run from the chunks and rebuilds the text before the result is persisted

#### Scenario: Human-pace repetition preserved
- **WHEN** the transcription result contains repeated words spoken at a human pace, such as emphatic repetition or song lyrics
- **THEN** the backend keeps those words because density, not repetition, is the signal

#### Scenario: Chunks without timestamps untouched
- **WHEN** a chunk has no numeric start timestamp
- **THEN** the filter keeps that chunk unchanged
