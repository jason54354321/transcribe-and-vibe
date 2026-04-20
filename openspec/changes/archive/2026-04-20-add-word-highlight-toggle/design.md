## Context

The current interactive transcript always applies playback-driven active-word highlighting whenever audio time updates advance through the transcript. That behavior is useful for guided review, but it also creates constant motion in the reading surface, which can be distracting for users who prefer to read the transcript without visual tracking. The repo already has a precedent for lightweight client-side display preferences through the dark-mode toggle: a visible UI control, local persistence, and startup restoration without any backend dependency.

## Goals / Non-Goals

**Goals:**
- Add a visible control that lets users enable or disable active-word highlighting during playback.
- Persist the user's preference on the client and restore it on reload.
- Keep click-to-seek on words and paragraph timestamps working exactly as it does today.
- Avoid backend API, transcription payload, and session schema changes for a purely presentation-level preference.

**Non-Goals:**
- Changing how the current word is computed from playback time.
- Reworking transcript rendering structure, paragraph grouping, or timestamp generation.
- Adding account-level sync or server-side preference storage.
- Introducing new transcript display modes beyond toggling playback-driven highlighting on or off.

## Decisions

### 1. Highlight control will be treated as a client-side UI preference
This change is a local presentation preference, not transcript data, so the state should live entirely in the frontend and restore from browser persistence on startup. That matches the existing dark-mode pattern and avoids coupling a personal reading preference to backend responses or saved transcript content.

**Alternatives considered:**
- Persist in session/transcript records: rejected because highlight preference is user-wide UI behavior, not session-specific transcription data.
- Persist on the backend: rejected because the app has no account model and the feature does not justify a server contract.

### 2. Playback synchronization logic will remain intact, but active styling becomes conditional
The app should continue computing the current word from playback time so click-to-seek and future interactions stay aligned with the existing model. When highlighting is disabled, the playback sync logic should stop applying the active CSS class and clear any previously active word, rather than forking transcript rendering into a separate code path.

**Alternatives considered:**
- Disable the whole playback-sync routine: rejected because other behaviors already rely on the current playback position and the change should stay minimal.
- Hide the active style with CSS only while still toggling classes underneath: rejected because it leaves stale active state in the DOM and makes the feature harder to reason about.

### 3. The control should live alongside existing top-level playback/transcription preferences
The most discoverable implementation is to place the new toggle near other app-level controls rather than burying it inside transcript-only markup. That keeps the preference visible before playback starts and aligns it with other persistent UI choices such as backend mode and theme-related controls.

**Alternatives considered:**
- Put the toggle inside each transcript block: rejected because the preference applies to the whole player, not individual paragraphs.
- Put the toggle only in a future settings panel: rejected because no dedicated settings surface exists today.

### 4. The delta spec will both add explicit preference behavior and modify the auto-highlight requirement
The current canonical spec assumes highlighting always happens during playback. To express the new contract clearly, the change should add a requirement for user control and persistence, then modify the existing auto-highlight requirement so it is explicitly conditional on the preference being enabled.

**Alternatives considered:**
- Only add a new requirement and leave the old auto-highlight requirement untouched: rejected because the old wording would still normatively require unconditional highlighting.

## Risks / Trade-offs

- **[Risk] The toggle location may crowd existing controls** → Mitigation: keep the control lightweight and reuse existing control-group styling patterns rather than introducing a new panel.
- **[Risk] Disabling highlight could leave a stale active word visible** → Mitigation: clear the active class immediately when the preference changes to off.
- **[Risk] Preference persistence could regress initialization order** → Mitigation: restore the preference during app startup using the same client-only pattern as other persisted UI state.
- **[Risk] Tests may only cover the enabled path** → Mitigation: add automated checks for enabled, disabled, and reload-restored behavior so both playback modes remain verified.
