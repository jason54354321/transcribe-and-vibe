## MODIFIED Requirements

### Requirement: Clickable word-level transcript rendering
The system SHALL render the transcription as a series of clickable word `<span>` elements. Each word span SHALL contain `data-start` (start time in milliseconds) and `data-end` (end time in milliseconds) attributes. Words SHALL be visually grouped by segments (sentence/phrase), with paragraph breaks between segments. Each rendered paragraph SHALL show a visible paragraph-start timestamp derived from the first word in that paragraph.

#### Scenario: Transcript rendered after transcription
- **WHEN** transcription result is received from the backend
- **THEN** each word is rendered as a `<span>` element with `data-start` and `data-end` attributes, words within a segment are space-separated, segments are visually separated as paragraphs, and each paragraph displays its start timestamp before the paragraph text

#### Scenario: Word hover feedback
- **WHEN** user hovers over a word in the transcript
- **THEN** the word shows a visual hover state (e.g., underline or background color change) indicating it is clickable

#### Scenario: Paragraph timestamp matches playback entry point
- **WHEN** a paragraph begins with a word whose `data-start` is `5230`
- **THEN** the paragraph displays a visible start timestamp corresponding to 5.23 seconds

### Requirement: Auto-highlight current word uses muted accent style
The system SHALL highlight the currently spoken word during audio playback by applying a reduced-brightness background derived from the `--accent-light` semantic token, with foreground color set to `--text-color` and a subtle outline from `--border-color`. The highlight SHALL remain visible and legible in both light and dark themes. Only one word SHALL be highlighted at any given time.

#### Scenario: Active word highlighted in light theme
- **WHEN** audio plays and the current word is highlighted in light mode
- **THEN** the word shows a muted accent-light background with readable text color, not a solid saturated accent block

#### Scenario: Active word highlighted in dark theme
- **WHEN** audio plays and the current word is highlighted in dark mode
- **THEN** the word shows the dark-palette equivalent of the muted accent background with readable text color

## ADDED Requirements

### Requirement: Paragraph timestamp click-to-seek
The system SHALL seek the audio player to a paragraph's start time when the paragraph-start timestamp span is clicked. The paragraph timestamp span SHALL include a `data-start` attribute containing the paragraph's start time in milliseconds, consistent with word spans, so the same click-to-seek handler processes it without special-casing.

#### Scenario: Click paragraph timestamp
- **WHEN** the user clicks a paragraph-start timestamp label in the transcript
- **THEN** the audio player seeks to that paragraph's start time (the first word's start time) and begins playing

#### Scenario: Paragraph timestamp co-exists with word click-to-seek
- **WHEN** both a paragraph timestamp and word spans are present in the transcript
- **THEN** clicking the paragraph timestamp seeks to the paragraph start and clicking a word span seeks to that word's start time, independently
