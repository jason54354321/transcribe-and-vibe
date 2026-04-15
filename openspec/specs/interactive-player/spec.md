## Purpose

Define the canonical requirements for the interactive transcript player UI, including upload interaction, progress display, transcript rendering, click-to-seek playback, highlighting, and audio controls.

## Requirements

### Requirement: Drag-and-drop audio upload
The system SHALL provide a drag-and-drop zone on the main page for selecting audio files. The system SHALL also provide a file picker button as fallback. The drop zone SHALL display visual feedback (highlight) when a file is dragged over it. Upon file selection, the system SHALL upload the audio to the backend and begin transcription.

#### Scenario: Drag MP3 onto drop zone
- **WHEN** user drags an MP3 file onto the drop zone area
- **THEN** drop zone shows visual highlight during dragover, and upon drop the audio is uploaded to the backend for transcription

#### Scenario: Click to select file
- **WHEN** user clicks the file picker button and selects an audio file
- **THEN** audio is uploaded to the backend and transcription begins

#### Scenario: Non-audio file dropped
- **WHEN** user drops a non-audio file (e.g., .pdf) onto the drop zone
- **THEN** system shows an error message indicating only audio files are accepted

### Requirement: Transcription progress indication
The system SHALL show a loading/progress indicator while audio is being transcribed by the backend. The indicator SHALL clearly communicate that processing is in progress and SHALL display status messages from the backend SSE stream (e.g., "Loading model...", "Transcribing 45%...").

#### Scenario: Long transcription in progress
- **WHEN** user selects a 10-minute audio file and the backend is processing
- **THEN** a visible loading indicator with status text is displayed, updated from SSE events

#### Scenario: Transcription completes
- **WHEN** the backend sends the final result SSE event
- **THEN** loading indicator is removed and the transcript is rendered

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

### Requirement: Click-to-seek playback
The system SHALL seek the audio player to the clicked word's start time and begin playback when any word in the transcript is clicked.

#### Scenario: Click a word to seek
- **WHEN** user clicks the word "beautiful" which has `data-start="5230"`
- **THEN** audio player seeks to 5.23 seconds and begins playing from that point

#### Scenario: Click while already playing
- **WHEN** audio is already playing and user clicks a different word
- **THEN** audio seeks to the new word's start time and continues playing from there without pause

### Requirement: Auto-highlight current word during playback
The system SHALL highlight the currently spoken word during audio playback by applying a distinct CSS class (e.g., background color). The highlight SHALL advance word-by-word as playback progresses, using `timeupdate` events from the audio element. Only one word SHALL be highlighted at any given time.

#### Scenario: Playback highlights words in sequence
- **WHEN** audio is playing through a sentence
- **THEN** each word is highlighted in turn as its timestamp is reached, with the previous word's highlight removed

#### Scenario: Highlight stays on last word when paused
- **WHEN** user pauses playback
- **THEN** the last highlighted word remains highlighted until playback resumes or user clicks another word

#### Scenario: Active word highlighted in light theme
- **WHEN** audio plays and the current word is highlighted in light mode
- **THEN** the word shows a muted accent-derived background with readable text color, not an unreadable or overly aggressive solid block

#### Scenario: Active word highlighted in dark theme
- **WHEN** audio plays and the current word is highlighted in dark mode
- **THEN** the word remains clearly visible against the transcript while using a muted Dark-Reader-inspired accent treatment

### Requirement: Paragraph timestamp click-to-seek
The system SHALL seek the audio player to a paragraph's start time when the paragraph-start timestamp span is clicked. The paragraph timestamp span SHALL include a `data-start` attribute containing the paragraph's start time in milliseconds, consistent with word spans, so the same click-to-seek handler processes it without special-casing.

#### Scenario: Click paragraph timestamp
- **WHEN** the user clicks a paragraph-start timestamp label in the transcript
- **THEN** the audio player seeks to that paragraph's start time (the first word's start time) and begins playing

#### Scenario: Paragraph timestamp co-exists with word click-to-seek
- **WHEN** both a paragraph timestamp and word spans are present in the transcript
- **THEN** clicking the paragraph timestamp seeks to the paragraph start and clicking a word span seeks to that word's start time, independently

### Requirement: Audio player controls
The system SHALL include a standard HTML5 audio player with native controls (play/pause, seek bar, volume, playback time display). The audio file SHALL be loaded into the player from the in-memory File/Blob (via `URL.createObjectURL`). The audio player SHALL be visible at all times once an audio file is loaded. The audio player composable SHALL expose `togglePlay()`, `skip(deltaSec)`, and `adjustVolume(delta)` methods, and a reactive `volume` ref, to support programmatic control from keyboard shortcuts and future UI enhancements.

#### Scenario: Audio player appears after file selection
- **WHEN** user selects an audio file
- **THEN** an HTML5 `<audio>` element with `controls` attribute is displayed, loaded with the selected audio file via Object URL

#### Scenario: Native controls functional
- **WHEN** user interacts with the audio player controls (play, pause, seek, volume)
- **THEN** playback responds accordingly and transcript highlight stays in sync

#### Scenario: Programmatic play/pause via composable
- **WHEN** `togglePlay()` is called on the audio player composable while audio is paused
- **THEN** audio begins playing, and calling `togglePlay()` again pauses it

#### Scenario: Programmatic seek via composable
- **WHEN** `skip(5)` is called on the audio player composable
- **THEN** audio position advances by 5 seconds, clamped to [0, duration]

#### Scenario: Programmatic volume adjustment via composable
- **WHEN** `adjustVolume(0.1)` is called on the audio player composable
- **THEN** audio volume increases by 0.1, clamped to [0.0, 1.0], and the reactive `volume` ref updates

### Requirement: Responsive layout
The system SHALL display properly on both desktop and mobile browsers. The transcript area SHALL be scrollable when content exceeds viewport height. The audio player SHALL remain accessible (sticky or always visible) while scrolling through the transcript.

#### Scenario: Desktop display
- **WHEN** page is viewed on a desktop browser (width >= 768px)
- **THEN** layout is comfortable with adequate margins and readable font size

#### Scenario: Mobile display
- **WHEN** page is viewed on a mobile browser (width < 768px)
- **THEN** layout adapts to full width, text remains readable, and audio player stays accessible

#### Scenario: Long transcript scrolling
- **WHEN** transcript exceeds viewport height
- **THEN** transcript area scrolls independently, and audio player remains visible (sticky positioning)
