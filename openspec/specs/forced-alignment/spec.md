## Purpose

Define the canonical requirements for optional forced alignment as a post-processing step to improve word-level timestamp accuracy beyond Whisper's built-in DTW.

## Requirements

### Requirement: Optional forced alignment for word timestamps
The system SHALL support optional forced alignment as a post-processing step after transcription. When enabled, the system SHALL use a CTC-based model (ctc-forced-aligner with MMS-300M or WhisperX wav2vec2) to re-align the transcript text to audio, producing more accurate word-level timestamps than Whisper's built-in DTW.

#### Scenario: Forced alignment enabled
- **WHEN** forced alignment is available and enabled
- **THEN** transcription result contains word-level timestamps from the forced aligner instead of Whisper's built-in DTW

#### Scenario: Forced alignment unavailable
- **WHEN** forced alignment model is not installed
- **THEN** system falls back to Whisper's built-in word timestamps (cross-attention DTW) without error

### Requirement: Forced alignment is opt-in
The system SHALL NOT require forced alignment for basic operation. Forced alignment SHALL be an optional enhancement that users or operators can enable. The default configuration SHALL use Whisper's built-in word timestamps.

#### Scenario: Default without forced alignment
- **WHEN** backend starts with default configuration
- **THEN** transcription uses Whisper's built-in DTW for word timestamps, no forced alignment model is loaded
