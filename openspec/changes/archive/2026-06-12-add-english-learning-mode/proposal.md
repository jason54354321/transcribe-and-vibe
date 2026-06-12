## Why

Language learners studying with the transcript player need to work through audio one sentence at a time: replay a sentence, step to the previous or next sentence, and have playback pause at the end of each sentence so they can repeat or shadow it. The current player only supports continuous playback with word-level highlighting, which makes sentence-by-sentence study awkward and manual.

## What Changes

- Add a "Learning mode" toggle alongside the existing dark-mode and word-highlight toggles, persisted in `localStorage`.
- While learning mode is enabled, automatically pause audio once playback reaches the end of the current sentence (once per sentence).
- Add keyboard shortcuts gated on learning mode: `a` jumps to and plays the previous sentence, `d` the next sentence, and `s` replays the current sentence from its start.
- Visually highlight the current sentence in the transcript with a subtle accent-tinted band, distinct from the solid single-word playback highlight.
- Derive sentences from the transcript chunks by splitting on sentence-ending punctuation, on long inter-word gaps, and at the end of the transcript.

## Capabilities

### Modified Capabilities
- `keyboard-shortcuts`: The system SHALL provide sentence navigation shortcuts (`a`/`d`/`s`) that are active only while learning mode is enabled, leaving existing shortcuts and normal typing unaffected.
- `interactive-player`: The player SHALL pause at sentence boundaries and highlight the current sentence while learning mode is enabled.

## Impact

- Affected frontend code: `src/utils/sentences.ts` (new), `src/composables/useEnglishLearningMode.ts` (new), `src/composables/useAudioPlayer.ts` (expose `play`/`pause`), `src/components/AudioPlayer.vue`, `src/composables/useKeyboardShortcuts.ts`, `src/components/TranscriptionControls.vue`, `src/components/TranscriptView.vue`, `src/App.vue`.
- Affected specs: `openspec/specs/keyboard-shortcuts/spec.md`, `openspec/specs/interactive-player/spec.md`.
- Expected testing impact: a Vitest unit test for sentence building and Playwright fast-loop coverage for the toggle, navigation shortcuts, and sentence auto-pause.
- No backend API, SSE contract, transcription, or session-storage changes.
