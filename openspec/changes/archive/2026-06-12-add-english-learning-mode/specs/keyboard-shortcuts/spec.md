## ADDED Requirements

### Requirement: Sentence navigation shortcuts in learning mode
The system SHALL provide sentence navigation keyboard shortcuts that are active only while learning mode is enabled and the audio source is loaded: `a` jumps to and plays the previous sentence, `d` jumps to and plays the next sentence, and `s` replays the current sentence from its start. These shortcuts SHALL be ignored when focus is on an interactive form element (`<input>`, `<textarea>`, `<select>`, `<button>`, or `[contenteditable]`), and SHALL NOT fire when learning mode is disabled so that normal typing and existing shortcuts are unaffected. The system SHALL call `preventDefault()` on the handled key events.

#### Scenario: Press D to advance to the next sentence
- **WHEN** learning mode is enabled, audio is loaded, focus is not on a form element, and the user presses `d`
- **THEN** audio seeks to the start of the next sentence and begins playing

#### Scenario: Press A to go to the previous sentence
- **WHEN** learning mode is enabled, audio is loaded, focus is not on a form element, and the user presses `a`
- **THEN** audio seeks to the start of the previous sentence and begins playing

#### Scenario: Press S to replay the current sentence
- **WHEN** learning mode is enabled, audio is loaded, focus is not on a form element, and the user presses `s`
- **THEN** audio seeks to the start of the current sentence and begins playing

#### Scenario: Sentence shortcuts ignored when learning mode is off
- **WHEN** learning mode is disabled and the user presses `a`, `d`, or `s`
- **THEN** the keystroke is not captured as a sentence navigation command and audio position is unchanged

#### Scenario: Sentence shortcuts ignored when typing in input
- **WHEN** learning mode is enabled and the user presses `a`, `d`, or `s` while focus is on an `<input>` or `<textarea>`
- **THEN** the keystroke is handled normally by the form field and not captured by the shortcut
