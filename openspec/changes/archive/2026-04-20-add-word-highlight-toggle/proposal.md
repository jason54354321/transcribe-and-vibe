## Why

The transcript currently always auto-highlights the active word during playback, but not every user wants that moving visual cue while reading. Adding an explicit on/off control lets users choose between guided playback tracking and a calmer reading mode without giving up word-level seeking.

## What Changes

- Add a user-visible control that turns automatic active-word highlighting on or off for transcript playback.
- Persist the user's highlight preference on the client so the chosen mode survives reloads.
- Preserve existing word click-to-seek, paragraph timestamp click-to-seek, and playback behavior while making active-word styling conditional on the saved preference.
- Keep transcript payloads, backend APIs, and word timestamp generation unchanged because this is a frontend playback-presentation preference.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `interactive-player`: Active-word highlighting SHALL be user-configurable, and the player SHALL stop applying playback-driven word highlighting when the preference is turned off.

## Impact

- Affected frontend UI: `src/App.vue`, `src/components/TranscriptView.vue`, and any composable or state holder chosen to manage the highlight preference.
- Affected specs: `openspec/specs/interactive-player/spec.md`.
- Expected testing impact: automated coverage for the toggle control, persisted preference, and playback behavior with highlighting both enabled and disabled.
- No intended backend API, engine, transcription, or session-storage schema changes.
