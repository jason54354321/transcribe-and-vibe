## Why

During playback the active word is highlighted, but on long transcripts the highlighted word quickly scrolls out of view and the user must scroll manually to keep following along. Automatically keeping the active word visible turns the transcript into a hands-free, karaoke-style reading experience that matches the audio position.

## What Changes

- Automatically scroll the transcript so the currently highlighted playback word stays visible while audio is playing.
- Suspend auto-scroll briefly when the user scrolls manually so the feature never fights the reader, resuming once playback advances past the user's scroll.
- Keep auto-scroll tied to playback only: when audio is paused or no audio is loaded, the view is left under the user's control.
- Preserve existing word click-to-seek, paragraph timestamp click-to-seek, highlighting, and audio controls unchanged.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `interactive-player`: The player SHALL keep the active playback word in view by auto-scrolling the transcript during playback, while yielding to manual user scrolling.

## Impact

- Affected frontend UI: `src/composables/useAudioPlayer.ts` (expose play state), `src/components/AudioPlayer.vue`, `src/components/TranscriptView.vue`, `src/App.vue`.
- Affected specs: `openspec/specs/interactive-player/spec.md`.
- Expected testing impact: automated coverage that the active word is scrolled into view during playback.
- No backend API, engine, transcription, or session-storage changes.
