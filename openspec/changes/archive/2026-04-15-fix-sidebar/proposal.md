## Why

On desktop, the session sidebar currently scrolls away with the page instead of remaining persistently available while users work through long transcripts. This makes session switching less reliable during review and undermines the two-pane layout the application already suggests.

## What Changes

- Make the desktop session sidebar remain persistently visible while the main transcript/content area scrolls.
- Preserve the existing mobile drawer behavior so the sidebar still opens as an overlay on small screens.
- Clarify the responsive layout requirement for the interactive player so desktop and mobile sidebar behavior are both explicitly covered.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interactive-player`: Update the responsive layout requirement so the desktop sidebar remains visible during main-content scrolling while mobile keeps the existing drawer interaction.

## Impact

- Frontend layout and responsive CSS in `src/App.vue` and `src/components/SessionList.vue`
- Playwright coverage for desktop layout persistence and mobile sidebar preservation
- Interactive player responsive layout contract in OpenSpec
