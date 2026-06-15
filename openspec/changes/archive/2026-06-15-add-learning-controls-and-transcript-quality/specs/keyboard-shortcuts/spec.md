## ADDED Requirements

### Requirement: W key toggles learning-mode auto-pause
The system SHALL toggle sentence-level auto-pause on and off when the user presses the `W` key, active only while learning mode is enabled and the audio source is loaded. This shortcut SHALL be ignored when focus is on an interactive form element (`<input>`, `<textarea>`, `<select>`, `<button>`, or `[contenteditable]`), and SHALL call `preventDefault()` on the handled key event.

#### Scenario: Press W to turn auto-pause off
- **WHEN** learning mode is enabled, audio is loaded, auto-pause is on, focus is not on a form element, and the user presses `W`
- **THEN** auto-pause is turned off and the status indicator reflects the off state

#### Scenario: Press W to turn auto-pause back on
- **WHEN** learning mode is enabled, audio is loaded, auto-pause is off, and the user presses `W`
- **THEN** auto-pause is turned on and the status indicator reflects the on state

#### Scenario: W ignored when typing in input
- **WHEN** the user presses `W` while focus is on an `<input>` or `<textarea>`
- **THEN** the keystroke is handled normally by the form field and not captured by the shortcut
