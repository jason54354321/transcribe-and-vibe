## ADDED Requirements

### Requirement: Auto-scroll transcript during playback
The system SHALL keep the currently highlighted playback word visible by automatically scrolling the transcript as playback advances. Auto-scroll SHALL only occur while audio is playing. The system SHALL temporarily suspend auto-scroll when the user scrolls manually so that automatic scrolling does not fight manual reading, and SHALL resume auto-scroll as playback continues past the suspension window.

#### Scenario: Active word kept in view during playback
- **WHEN** audio is playing and the highlighted word advances to a position that would otherwise be outside the visible viewport
- **THEN** the transcript scrolls so the highlighted word is brought back into view

#### Scenario: No auto-scroll while paused
- **WHEN** audio is paused
- **THEN** the transcript does not auto-scroll and the view remains under the user's control

#### Scenario: Manual scroll temporarily suspends auto-scroll
- **WHEN** the user scrolls the page manually during playback
- **THEN** auto-scroll is suspended for a short window so it does not immediately scroll the view back, and resumes as playback advances afterward
