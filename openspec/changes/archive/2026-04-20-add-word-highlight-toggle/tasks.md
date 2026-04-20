## 1. Preference state and UI control

- [x] 1.1 Add client-side state and persistence for the word highlight preference, including startup restoration of the saved value.
- [x] 1.2 Add a visible word highlight toggle control in the existing top-level app controls without disrupting current backend/theme/playback controls.

## 2. Transcript highlight behavior

- [x] 2.1 Update transcript playback-highlighting logic so active-word styling is only applied when the preference is enabled.
- [x] 2.2 Clear any currently active word immediately when the preference is turned off, while preserving word click-to-seek and paragraph timestamp click-to-seek behavior.

## 3. Verification

- [x] 3.1 Add or update automated tests covering highlight enabled, highlight disabled, and preference restoration after reload.
- [x] 3.2 Run the relevant build and test commands to confirm the toggle works without regressing existing transcript playback behavior.
