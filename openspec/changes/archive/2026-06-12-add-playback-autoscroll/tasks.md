## 1. Playback state

- [x] 1.1 Expose a reactive `isPlaying` state from the audio player composable, tracked from native `play`/`pause`/`ended` events.
- [x] 1.2 Surface playback state to the transcript view through the audio player component and `App.vue`.

## 2. Auto-scroll behavior

- [x] 2.1 Scroll the active playback word into view (centered) when the highlighted word changes while audio is playing.
- [x] 2.2 Suspend auto-scroll for a short window when the user scrolls manually, and resume automatically as playback advances.

## 3. Verification

- [x] 3.1 Add automated coverage that the active word is scrolled into the viewport during playback.
- [x] 3.2 Run the relevant build and test commands to confirm no regression to existing playback, highlight, and seek behavior.
