## 1. Active-word highlight alignment

- [x] 1.1 Split each word's leading whitespace out of the highlightable span so the active-word highlight box wraps only the word glyphs while words remain space-separated.

## 2. Toggleable auto-pause

- [x] 2.1 Add an auto-pause enabled state that defaults on and persists to localStorage across reloads.
- [x] 2.2 Bind the `W` key to toggle auto-pause and show a floating status indicator while learning mode is active.
- [x] 2.3 Make sentence-level auto-pause fire only when the toggle is enabled.

## 3. Hallucination filtering

- [x] 3.1 Add a density-based filter that removes superhuman word-per-second runs without flagging repetition itself.
- [x] 3.2 Apply the filter to the transcription result before it is persisted.

## 4. Verification

- [x] 4.1 Unit-test the auto-pause toggle behavior and the hallucination density filter.
- [x] 4.2 Run the frontend fast and unit suites and the backend suite to confirm no regression.
