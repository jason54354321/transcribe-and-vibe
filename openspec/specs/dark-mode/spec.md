## Purpose

Define the canonical requirements for application theme behavior, including light/dark presentation, preference persistence, and initial theme selection.

## Requirements

### Requirement: Application supports light and dark themes
The system SHALL provide both light and dark visual themes for the main application UI. All primary surfaces, text, borders, interactive controls, transcript content, and playback UI SHALL remain readable and visually consistent in either theme.

#### Scenario: User enables dark mode
- **WHEN** the user switches the application theme to dark mode
- **THEN** the application renders using dark-theme color tokens across the main layout, transcript, controls, banners, and sidebar

#### Scenario: User returns to light mode
- **WHEN** the user switches the application theme back to light mode
- **THEN** the application restores the light-theme color tokens without changing transcript or playback state

### Requirement: Theme preference persists across reloads
The system SHALL persist the user's selected theme on the client and reapply it when the application is opened again.

#### Scenario: Reload after selecting dark mode
- **WHEN** the user reloads the page after previously selecting dark mode
- **THEN** the application starts in dark mode without requiring the user to reselect it

#### Scenario: Reload after selecting light mode
- **WHEN** the user reloads the page after previously selecting light mode
- **THEN** the application starts in light mode without requiring the user to reselect it

### Requirement: Initial theme follows OS color scheme preference
When no saved user preference exists, the system SHALL detect the OS-level color scheme preference (`prefers-color-scheme`) and apply the matching theme on startup.

#### Scenario: First visit on a system with dark mode enabled
- **WHEN** a user opens the application for the first time on a system where `prefers-color-scheme` is `dark`
- **THEN** the application starts in dark mode without requiring any user action

#### Scenario: First visit on a system with light mode or no preference
- **WHEN** a user opens the application for the first time on a system where `prefers-color-scheme` is `light` or not set
- **THEN** the application starts in light mode
