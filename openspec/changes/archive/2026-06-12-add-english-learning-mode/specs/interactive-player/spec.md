## ADDED Requirements

### Requirement: Sentence-level auto-pause in learning mode
The system SHALL automatically pause audio playback when, while learning mode is enabled and audio is playing, the current playback position reaches the end of the current sentence. The system SHALL pause at most once per sentence so that the learner can manually resume, replay, or navigate without being repeatedly paused at the same boundary.

#### Scenario: Pause at the end of the current sentence
- **WHEN** learning mode is enabled, audio is playing, and the playback position advances to or past the end of the current sentence
- **THEN** audio pauses at that position

#### Scenario: Auto-pause does not repeat for the same sentence
- **WHEN** audio has already been auto-paused at the end of a sentence and the user resumes playback without leaving that sentence
- **THEN** the system does not immediately pause again for the same sentence

#### Scenario: No auto-pause when learning mode is disabled
- **WHEN** learning mode is disabled and playback advances past a sentence boundary
- **THEN** audio continues playing without auto-pausing

### Requirement: Current sentence highlight in learning mode
The system SHALL visually highlight every word of the current sentence with a subtle accent-tinted background while learning mode is enabled, so the learner can see the unit being studied. This sentence highlight SHALL remain visually distinct from, and subordinate to, the single active-word playback highlight.

#### Scenario: Current sentence is highlighted
- **WHEN** learning mode is enabled and a sentence is current for the playback position
- **THEN** all words of that sentence receive the sentence highlight background

#### Scenario: Active word remains visually dominant
- **WHEN** learning mode is enabled, word highlighting is enabled, and the active word lies within the current sentence
- **THEN** the active word retains its stronger single-word highlight on top of the subtle sentence band
