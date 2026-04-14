## ADDED Requirements

### Requirement: Space bar toggles play/pause
The system SHALL toggle audio playback (play ↔ pause) when the user presses the Space bar, provided the audio source is loaded and focus is not on an interactive form element (`<input>`, `<textarea>`, `<select>`, `<button>`, or `[contenteditable]`). The system SHALL call `preventDefault()` to suppress page scrolling.

#### Scenario: Press Space to play from paused state
- **WHEN** audio is loaded and paused, and user presses Space while focus is not on a form element
- **THEN** audio begins playing from the current position, and the page does not scroll

#### Scenario: Press Space to pause from playing state
- **WHEN** audio is playing, and user presses Space while focus is not on a form element
- **THEN** audio pauses at the current position

#### Scenario: Space ignored when typing in input
- **WHEN** user presses Space while focus is on an `<input>` or `<textarea>` element
- **THEN** the keystroke is handled normally by the input field (not captured by the shortcut)

#### Scenario: Space ignored when no audio loaded
- **WHEN** no audio file has been loaded into the player, and user presses Space
- **THEN** the keystroke is not captured and the browser default behavior (page scroll) occurs

### Requirement: Arrow keys seek audio ±5 seconds
The system SHALL seek the audio backward 5 seconds when the user presses the Left arrow key, and forward 5 seconds when the user presses the Right arrow key, provided the audio source is loaded and focus is not on an interactive form element. The system SHALL clamp the seek position to [0, duration]. The system SHALL call `preventDefault()` on the handled key events.

#### Scenario: Press Left arrow to seek backward
- **WHEN** audio is loaded at position 10.0s, and user presses Left arrow
- **THEN** audio seeks to 5.0s and transcript highlight updates accordingly

#### Scenario: Press Right arrow to seek forward
- **WHEN** audio is loaded at position 10.0s with total duration 60.0s, and user presses Right arrow
- **THEN** audio seeks to 15.0s and transcript highlight updates accordingly

#### Scenario: Seek backward clamped to zero
- **WHEN** audio is at position 2.0s and user presses Left arrow
- **THEN** audio seeks to 0.0s (not negative)

#### Scenario: Seek forward clamped to duration
- **WHEN** audio is at position 58.0s with total duration 60.0s, and user presses Right arrow
- **THEN** audio seeks to 60.0s (not beyond duration)

#### Scenario: Arrow keys ignored in text input
- **WHEN** user presses Left or Right arrow while focus is on a `<textarea>`
- **THEN** the cursor moves within the text field normally (shortcut not captured)

### Requirement: Up/Down arrow keys adjust volume ±10%
The system SHALL increase audio volume by 10% (0.1) when the user presses the Up arrow key, and decrease by 10% when the user presses the Down arrow key, provided the audio source is loaded and focus is not on an interactive form element. The volume SHALL be clamped to [0.0, 1.0]. The system SHALL call `preventDefault()` to suppress page scrolling. The system SHALL show a brief visual volume indicator upon change.

#### Scenario: Press Up arrow to increase volume
- **WHEN** audio is loaded with volume at 0.5, and user presses Up arrow
- **THEN** volume increases to 0.6 and a brief indicator shows "60%"

#### Scenario: Press Down arrow to decrease volume
- **WHEN** audio is loaded with volume at 0.5, and user presses Down arrow
- **THEN** volume decreases to 0.4 and a brief indicator shows "40%"

#### Scenario: Volume clamped at maximum
- **WHEN** volume is at 0.95 and user presses Up arrow
- **THEN** volume is set to 1.0 (not above) and indicator shows "100%"

#### Scenario: Volume clamped at minimum
- **WHEN** volume is at 0.05 and user presses Down arrow
- **THEN** volume is set to 0.0 and indicator shows "0%"

#### Scenario: Volume visual feedback auto-dismisses
- **WHEN** user presses Up or Down arrow and volume changes
- **THEN** a volume indicator appears near the audio player and disappears after approximately 1 second
