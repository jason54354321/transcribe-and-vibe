## Why

Audio transcription review requires constant play/pause and seeking. Currently, users must click small native `<audio controls>` buttons, breaking their reading flow. Keyboard shortcuts (Space, arrow keys) let users control playback without leaving the transcript, matching the UX of YouTube, VLC, and Descript.

## What Changes

- Add global keyboard event listener for playback control shortcuts
- Extend `useAudioPlayer` composable with `togglePlay()`, `skip(seconds)`, and `setVolume(delta)` methods
- Add visual volume indicator (brief overlay or status bar integration) so users get feedback on volume changes
- Guard shortcuts: skip when `activeElement` is `<input>` or `<textarea>`; `preventDefault` on captured keys to avoid page scroll

## Capabilities

### New Capabilities
- `keyboard-shortcuts`: Global keyboard shortcuts for audio playback — Space (play/pause), ←/→ (seek ±5s), ↑/↓ (volume ±10%)

### Modified Capabilities
- `interactive-player`: Add requirement for keyboard-driven playback control and volume state management (currently only mouse/touch via native `<audio controls>`)

## Impact

- **Code**: `useAudioPlayer.ts` (new methods), `AudioPlayer.vue` or `App.vue` (key listener registration), new composable or utility for shortcut handling
- **APIs**: No backend changes
- **Dependencies**: None — uses native `KeyboardEvent` API
- **Accessibility**: Improves keyboard-only usability; must not break screen reader navigation
