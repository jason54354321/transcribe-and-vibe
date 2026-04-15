## Why

The current transcript view groups words into paragraphs, but users cannot see when each paragraph begins without hovering individual words. The app also ships with a light-only theme, which makes the interface less comfortable in low-light environments and inconsistent with modern user expectations.

## What Changes

- Show each rendered transcript paragraph with a visible paragraph-start timestamp so users can scan transcript structure and jump into playback more easily. Paragraph-start timestamps are clickable and seek audio to the paragraph's entry point.
- Add a dark mode experience for the main application UI using the existing CSS variable system instead of maintaining light-only styling. Initial theme state is auto-detected from the OS `prefers-color-scheme` preference when no saved preference exists.
- Reduce the active-word highlight from a solid saturated accent block to a muted accent-light background so the highlight remains legible in both themes without obscuring the text.
- Preserve existing word-level click-to-seek behavior, active-word highlighting, and transcript grouping while extending the presentation layer.
- Keep backend APIs and transcription payload formats unchanged unless a spec update proves additional paragraph metadata is required.
- Explicitly leave static marketing/demo-site work out of scope for this change.

## Capabilities

### New Capabilities
- `dark-mode`: Theme selection and rendering behavior for light and dark presentation across the application UI.

### Modified Capabilities
- `interactive-player`: Transcript paragraphs SHALL show a visible paragraph-start timestamp while retaining clickable word spans and paragraph grouping.

## Impact

- Affected frontend UI: `src/components/TranscriptView.vue`, `src/App.vue`, and any components that still use hardcoded light-theme colors.
- Affected specs: `openspec/specs/interactive-player/spec.md` and a new capability spec for `dark-mode`.
- Expected testing impact: Playwright coverage for visible paragraph timestamps and theme behavior across reloads or initial page load.
- No intended backend API, engine, or deployment changes.
