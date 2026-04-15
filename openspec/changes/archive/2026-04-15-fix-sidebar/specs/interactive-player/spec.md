## MODIFIED Requirements

### Requirement: Responsive layout
The system SHALL display properly on both desktop and mobile browsers. On desktop layouts, the session sidebar SHALL remain visible while the main transcript/content area scrolls. The session sidebar SHALL remain usable when its own content exceeds the viewport height. On mobile layouts, the existing drawer-style sidebar interaction SHALL remain available for accessing sessions without forcing a permanently visible sidebar. The transcript area SHALL be scrollable when content exceeds viewport height. The audio player SHALL remain accessible (sticky or always visible) while scrolling through the transcript.

#### Scenario: Desktop sidebar remains visible during content scrolling
- **WHEN** the page is viewed on a desktop browser and the main content exceeds the viewport height
- **THEN** the session sidebar remains visible while the main transcript/content area scrolls independently

#### Scenario: Desktop sidebar remains usable with many sessions
- **WHEN** the page is viewed on a desktop browser and the session list exceeds the viewport height
- **THEN** the session sidebar remains visible and the user can still access sessions within the sidebar

#### Scenario: Mobile display preserves drawer behavior
- **WHEN** the page is viewed on a mobile browser
- **THEN** the sidebar continues to behave as a drawer-style navigation panel rather than a permanently visible desktop rail

#### Scenario: Long transcript scrolling
- **WHEN** transcript exceeds viewport height
- **THEN** transcript area scrolls independently, and audio player remains visible (sticky positioning)
