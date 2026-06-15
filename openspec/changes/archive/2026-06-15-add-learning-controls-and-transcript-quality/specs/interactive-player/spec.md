## MODIFIED Requirements

### Requirement: Clickable word-level transcript rendering
The system SHALL render the transcription as a series of clickable word `<span>` elements. Each word span SHALL contain `data-start` (start time in milliseconds) and `data-end` (end time in milliseconds) attributes. A word's leading whitespace SHALL be rendered outside its clickable span so that the active-word highlight and click target wrap only the word glyphs while words remain visually space-separated. Words SHALL be visually grouped by segments (sentence/phrase), with paragraph breaks between segments. Each rendered paragraph SHALL show a visible paragraph-start timestamp derived from the first word in that paragraph.

#### Scenario: Transcript rendered after transcription
- **WHEN** transcription result is received from the backend
- **THEN** each word is rendered as a `<span>` element with `data-start` and `data-end` attributes, words within a segment are space-separated, segments are visually separated as paragraphs, and each paragraph displays its start timestamp before the paragraph text

#### Scenario: Highlight box aligns to the word
- **WHEN** a word that is preceded by a space becomes the active playback word
- **THEN** the highlight background wraps only the word glyphs, not the leading space, because the leading whitespace is rendered outside the word span

#### Scenario: Word hover feedback
- **WHEN** user hovers over a word in the transcript
- **THEN** the word shows a visual hover state (e.g., underline or background color change) indicating it is clickable

#### Scenario: Paragraph timestamp matches playback entry point
- **WHEN** a paragraph begins with a word whose `data-start` is `5230`
- **THEN** the paragraph displays a visible start timestamp corresponding to 5.23 seconds

### Requirement: Sentence-level auto-pause in learning mode
The system SHALL automatically pause audio playback when, while learning mode is enabled, auto-pause is enabled, and audio is playing, the current playback position reaches the end of the current sentence. The system SHALL pause at most once per sentence so that the learner can manually resume, replay, or navigate without being repeatedly paused at the same boundary. Auto-pause SHALL be toggleable, SHALL default to enabled, SHALL persist its state across reloads, and while learning mode is active the system SHALL show a floating indicator of whether auto-pause is on or off.

#### Scenario: Pause at the end of the current sentence
- **WHEN** learning mode is enabled, auto-pause is enabled, audio is playing, and the playback position advances to or past the end of the current sentence
- **THEN** audio pauses at that position

#### Scenario: Auto-pause does not repeat for the same sentence
- **WHEN** audio has already been auto-paused at the end of a sentence and the user resumes playback without leaving that sentence
- **THEN** the system does not immediately pause again for the same sentence

#### Scenario: No auto-pause when auto-pause is disabled
- **WHEN** learning mode is enabled but auto-pause is disabled and playback advances past a sentence boundary
- **THEN** audio continues playing without auto-pausing

#### Scenario: No auto-pause when learning mode is disabled
- **WHEN** learning mode is disabled and playback advances past a sentence boundary
- **THEN** audio continues playing without auto-pausing

#### Scenario: Auto-pause state persists across reloads
- **WHEN** the user toggles auto-pause and later reloads the application
- **THEN** the previously chosen auto-pause state is restored
