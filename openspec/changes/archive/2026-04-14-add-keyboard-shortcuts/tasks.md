## 1. Extend useAudioPlayer composable

- [x] 1.1 Add `togglePlay()` method — calls `audioRef.play()` or `audioRef.pause()` based on `paused` state
- [x] 1.2 Add `skip(deltaSec: number)` method — adjusts `currentTime` by delta, clamped to [0, duration]
- [x] 1.3 Add `adjustVolume(delta: number)` method — adjusts `volume` by delta, clamped to [0.0, 1.0]
- [x] 1.4 Add reactive `volume` ref (0–1), synced with `audioRef.volume` via `volumechange` event

## 2. Create useKeyboardShortcuts composable

- [x] 2.1 Create `src/composables/useKeyboardShortcuts.ts` that accepts the audio player API (`togglePlay`, `skip`, `adjustVolume`, and a `hasSource` signal)
- [x] 2.2 Register `keydown` listener on `window` in `onMounted`, remove in `onUnmounted`
- [x] 2.3 Implement input guard: skip handling when `document.activeElement` matches `input, textarea, select, button, [contenteditable]`
- [x] 2.4 Implement source guard: skip handling when no audio source is loaded
- [x] 2.5 Handle Space → `togglePlay()` + `preventDefault()`
- [x] 2.6 Handle ArrowLeft → `skip(-5)` + `preventDefault()`
- [x] 2.7 Handle ArrowRight → `skip(5)` + `preventDefault()`
- [x] 2.8 Handle ArrowUp → `adjustVolume(0.1)` + `preventDefault()`
- [x] 2.9 Handle ArrowDown → `adjustVolume(-0.1)` + `preventDefault()`

## 3. Volume visual feedback

- [x] 3.1 Add volume overlay element in `AudioPlayer.vue` (e.g., `<div class="volume-indicator">`) showing percentage
- [x] 3.2 Show overlay on volume change, auto-dismiss after ~1 second (CSS transition or setTimeout)
- [x] 3.3 Style overlay with scoped CSS using existing CSS custom properties

## 4. Wire up in App.vue

- [x] 4.1 Import and call `useKeyboardShortcuts()` in `App.vue`, passing the active transcriber's audio player API
- [x] 4.2 Provide a `hasSource` computed that reflects whether audio is loaded

## 5. Tests

- [x] 5.1 Add Vitest unit tests for `useAudioPlayer` new methods (`togglePlay`, `skip`, `adjustVolume`)
- [x] 5.2 Add Playwright test in `tests/fast.spec.ts`: Space toggles play/pause, arrow keys seek, arrow keys adjust volume (mock-based)
