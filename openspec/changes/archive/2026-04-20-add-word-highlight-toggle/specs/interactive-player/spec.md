## ADDED Requirements

### Requirement: User-controlled word highlight preference
The system SHALL provide a user-visible control that enables or disables playback-driven active-word highlighting in the transcript. The system SHALL persist the selected preference on the client and restore it on reload so the transcript uses the same highlight mode the next time the application is opened.

#### Scenario: User disables word highlighting
- **WHEN** the user turns the word highlight control off
- **THEN** the transcript stops showing an active playback word highlight and any currently highlighted word is cleared

#### Scenario: User enables word highlighting again
- **WHEN** the user turns the word highlight control back on while a transcript with timestamps is available
- **THEN** the transcript resumes showing the current playback word highlight according to the audio position

#### Scenario: Reload restores saved highlight preference
- **WHEN** the user reloads the page after previously turning word highlighting off or on
- **THEN** the application restores the saved highlight preference before transcript playback interactions continue

## MODIFIED Requirements

### Requirement: Auto-highlight current word during playback
The system SHALL highlight the currently spoken word during audio playback by applying a distinct CSS class (e.g., background color) when the user's word highlight preference is enabled. The highlight SHALL advance word-by-word as playback progresses, using `timeupdate` events from the audio element. Only one word SHALL be highlighted at any given time. When the user's word highlight preference is disabled, the system SHALL NOT apply playback-driven active-word highlighting.

#### Scenario: Playback highlights words in sequence when enabled
- **WHEN** audio is playing through a sentence and the user's word highlight preference is enabled
- **THEN** each word is highlighted in turn as its timestamp is reached, with the previous word's highlight removed

#### Scenario: Highlight stays on last word when paused while enabled
- **WHEN** the user pauses playback while the word highlight preference is enabled
- **THEN** the last highlighted word remains highlighted until playback resumes or the user clicks another word

#### Scenario: Active word highlighted in light theme when enabled
- **WHEN** audio plays in light mode and the current word is highlighted while the word highlight preference is enabled
- **THEN** the word shows a distinct accent-colored highlight with readable text color so the current playback position remains obvious during guided review

#### Scenario: Active word highlighted in dark theme when enabled
- **WHEN** audio plays in dark mode and the current word is highlighted while the word highlight preference is enabled
- **THEN** the word remains clearly visible against the transcript while preserving the same strong accent-highlight treatment used to track the current playback word

#### Scenario: Playback does not apply highlight when disabled
- **WHEN** audio is playing and the user's word highlight preference is disabled
- **THEN** the transcript does not mark any word as the active playback highlight
