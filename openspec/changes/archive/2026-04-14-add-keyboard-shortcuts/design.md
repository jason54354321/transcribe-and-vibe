## Context

The app currently provides mouse/touch-only audio control via native `<audio controls>`. Users reviewing transcripts must move between the transcript text and the small audio controls, breaking their reading flow. The `useAudioPlayer` composable exposes `audioRef`, `currentTimeMs`, `setSource`, and `seekTo` — but has no `togglePlay()`, `skip()`, or volume control.

All keyboard events go unhandled today. The `<audio>` element's native keyboard handling only works when the element itself is focused, which rarely happens during transcript review.

## Goals / Non-Goals

**Goals:**
- Enable hands-on-keyboard playback control (play/pause, seek, volume) while reading transcript
- Follow conventions users already know from YouTube and VLC
- Prevent shortcuts from interfering with text input fields or browser defaults
- Provide brief visual feedback on volume changes

**Non-Goals:**
- Playback speed control shortcuts (future enhancement)
- Customizable key bindings
- Media Session API integration (hardware media keys)
- On-screen keyboard shortcut help overlay (`?` key)

## Decisions

### 1. Shortcut scope: global `window` listener with input guard

**Choice**: Single `keydown` listener on `window`, skip handling when `document.activeElement` is `<input>`, `<textarea>`, or `[contenteditable]`.

**Alternatives considered**:
- Scoped to audio container (requires explicit focus, poor UX — user rarely focuses the player)
- Scoped to a wrapper `<div tabindex="0">` (requires click-to-focus, still worse than global)

**Rationale**: YouTube, SoundCloud, and VLC all use global listeners with input guards. Users expect shortcuts to work without clicking the player first.

### 2. New composable: `useKeyboardShortcuts`

**Choice**: Create `src/composables/useKeyboardShortcuts.ts` that takes the audio player API and registers/cleans up the `keydown` listener.

**Rationale**: Keeps shortcut logic isolated, testable, and reusable. Follows the existing composable pattern (`useAudioPlayer`, `useFileUpload`, etc.).

### 3. Extend `useAudioPlayer` with playback control methods

**Choice**: Add `togglePlay()`, `skip(deltaSec: number)`, and `adjustVolume(delta: number)` to the existing `useAudioPlayer` composable. Expose `volume` as a reactive ref (0–1).

**Alternatives considered**:
- Separate `usePlaybackControl` composable — adds unnecessary indirection since it still needs `audioRef`
- Put methods directly in `useKeyboardShortcuts` — mixing concerns

**Rationale**: These are fundamental audio operations that belong with the player API, not with the keyboard layer. Other future consumers (UI buttons, media session) can reuse them.

### 4. Volume feedback: brief toast/overlay near the audio player

**Choice**: Show a small, auto-dismissing overlay (e.g., "🔊 70%") near the audio player for ~1 second on volume change. Implemented inside `AudioPlayer.vue`.

**Rationale**: Without feedback, users won't know if their keypress worked or what the current volume is. A brief overlay is lightweight and doesn't require new components.

### 5. `preventDefault` strategy

**Choice**: Call `event.preventDefault()` only for the exact keys we handle (Space, ArrowLeft, ArrowRight, ArrowUp, ArrowDown), and only when not in an input field and audio source is loaded.

**Rationale**: Prevents Space from scrolling and arrows from scrolling, without accidentally blocking any other browser shortcuts.

## Risks / Trade-offs

- **[Space scrolls page]** → Mitigated by `preventDefault()` on Space when audio is loaded. If no audio loaded, Space scrolls normally (expected).
- **[Arrow keys conflict with scroll]** → Same mitigation. Bare ↑/↓ won't scroll when audio is loaded; acceptable tradeoff since users are in "review mode" at that point.
- **[Screen reader interference]** → Risk that global key capture breaks assistive tech. Mitigation: skip handling when focus is on any interactive element (`input`, `textarea`, `select`, `button`, `[contenteditable]`), and never capture Tab, Enter, or Escape.
- **[Volume mismatch with native slider]** → `adjustVolume` sets `audioRef.volume` directly; native `<audio controls>` slider may not reflect this. Acceptable — the toast overlay shows the actual value. Future: replace native controls with custom UI.
