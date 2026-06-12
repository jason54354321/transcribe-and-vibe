## 1. Sentence model

- [x] 1.1 Add `buildSentences` and the `Sentence` type in `src/utils/sentences.ts`, splitting on punctuation, long gaps, and end of transcript over the timestamped words.
- [x] 1.2 Add Vitest coverage for punctuation split, gap split, null-timestamp dropping, and index ranges.

## 2. Learning mode behavior

- [x] 2.1 Add the `useEnglishLearningMode` composable computing `sentences`, `currentSentenceIndex`, and the auto-pause watcher.
- [x] 2.2 Provide `prevSentence`, `nextSentence`, and `replaySentence` navigation.
- [x] 2.3 Expose `play`/`pause` from the audio player composable and component.

## 3. UI and shortcuts

- [x] 3.1 Add the "Learning mode" toggle (`#learning-toggle`) with persistence in `App.vue`.
- [x] 3.2 Gate `a`/`d`/`s` shortcuts on learning mode in `useKeyboardShortcuts`.
- [x] 3.3 Highlight the current sentence band in `TranscriptView.vue` and extend the keyboard hints.

## 4. Verification

- [x] 4.1 Add Playwright fast-loop coverage for the toggle, navigation shortcuts, and sentence auto-pause.
- [x] 4.2 Run build, lint, fast Playwright tests, and unit tests with no regressions.
