## MODIFIED Requirements

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
