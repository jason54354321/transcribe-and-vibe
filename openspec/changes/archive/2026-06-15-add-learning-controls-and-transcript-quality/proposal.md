## Why

Three interconnected transcript-quality and learning-control fixes shipped together:

- The active-word highlight box was misaligned because leading whitespace was rendered inside the highlightable word span, so the highlight covered the space before the word instead of wrapping the word glyphs.
- Sentence-level auto-pause in learning mode was always on, with no way to turn it off for a continuous listen, and no visible indication of its state.
- Whisper occasionally degenerates into repetition loops whose word timestamps collapse into an impossible speaking rate (e.g. 221 words in a one-second window), and those hallucinated bursts were persisted into the session transcript.

## What Changes

- Render leading whitespace outside the clickable/highlightable word span so the active-word highlight box wraps only the word, while words stay space-separated.
- Make sentence-level auto-pause toggleable: it defaults on, persists across reloads, is toggled with the `W` key, and shows a floating status indicator while learning mode is active. Auto-pause only fires when enabled.
- Filter superhuman-density word runs out of the transcript before it is persisted, using word-per-second density (not repetition) so emphatic speech and lyrics are preserved.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `interactive-player`: Word rendering keeps leading whitespace outside the highlightable span so the active-word highlight aligns to the word; sentence-level auto-pause becomes toggleable with persistence and a status indicator.
- `keyboard-shortcuts`: Add a `W` shortcut that toggles learning-mode auto-pause.
- `audio-transcription`: Filter superhuman-density (hallucinated) word runs from the transcript before persistence.

## Impact

- **Frontend**: `TranscriptView.vue` (whitespace-aware word spans), `App.vue` (auto-pause state, persistence, status badge, hint), `useKeyboardShortcuts.ts` (`W` key), `useEnglishLearningMode.ts` (respect the toggle).
- **Backend**: new `hallucination.py` density filter applied in `main.py` before the result is persisted.
- **Tests**: `useEnglishLearningMode.test.ts`, `tests/fast/learning.spec.ts`, `tests/fast/core.spec.ts`, `backend/test_hallucination.py`.
