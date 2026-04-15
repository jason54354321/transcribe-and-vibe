## 1. Theme infrastructure

- [x] 1.1 Add client-side theme state and persistence so the app can restore the selected light or dark theme on reload.
- [x] 1.2 Extend the global token definitions in `src/App.vue` with dark-theme values and apply them through a root theme attribute.
- [x] 1.3 Add a visible theme control to the application UI without disrupting existing transcription controls.

## 2. Component theme adoption

- [x] 2.1 Replace hardcoded light-theme colors in transcript, audio player, warning, and error surfaces with shared semantic tokens.
- [x] 2.2 Verify the sidebar, drop zone, status, and transcript interaction states remain legible and visually consistent in both themes.

## 3. Paragraph timestamp presentation

- [x] 3.1 Update `src/components/TranscriptView.vue` to render a visible paragraph-start timestamp using each paragraph's first word start time.
- [x] 3.2 Style paragraph timestamps as secondary metadata while preserving clickable word spans, paragraph grouping, and active-word highlighting.
- [x] 3.3 Ensure paragraph timestamp rendering does not require backend or transcription payload changes.

## 4. Verification

- [x] 4.1 Add or update automated tests for visible paragraph-start timestamps in the transcript view.
- [x] 4.2 Add or update automated tests for theme switching and persisted theme restoration across reloads.
- [x] 4.3 Run the relevant build and test commands to confirm the feature works without regressing existing behavior.
