## Context

The current transcript UI already derives paragraph boundaries in `src/components/TranscriptView.vue` by splitting words when adjacent chunks are separated by more than 0.8 seconds. This means the UI has enough information to show paragraph-start timestamps without changing the backend transcription contract. The app also centralizes many visual tokens in `src/App.vue`, but several transcript and player styles still use hardcoded light-theme colors, so adding dark mode requires both a global theme state and a cleanup pass across component styles.

## Goals / Non-Goals

**Goals:**
- Show a visible timestamp at the beginning of each transcript paragraph using the paragraph's first word start time.
- Add a user-visible dark mode for the existing app UI while preserving current layout and interaction patterns.
- Reuse the existing CSS variable approach so most theme changes remain declarative and localized to styling.
- Keep the current backend API and transcription payload shape unchanged.

**Non-Goals:**
- Reworking transcript segmentation logic or changing how silence gaps are detected.
- Adding paragraph metadata to backend responses.
- Building a separate static marketing/demo site as part of this change.
- Introducing additional visual themes beyond light and dark.

## Decisions

### 1. Paragraph-start timestamps will be computed in the transcript view, not returned by the backend
The transcript view already groups chunks into paragraphs and has access to each paragraph's first word start time. Reusing that derived state keeps the change scoped to presentation and avoids expanding backend contracts, SSE payloads, or session data formats.

**Alternatives considered:**
- Add paragraph metadata to transcription results: rejected because paragraph grouping is currently a frontend presentation concern and would duplicate logic across modes.
- Render timestamps via hover-only affordances: rejected because the request is for visible paragraph-start times, not hidden metadata.

### 2. Dark mode will use semantic CSS variables with a root theme attribute
The app already uses `:root` custom properties for core colors. Extending that approach with light and dark token sets, keyed off a root theme attribute, keeps styles consistent and avoids per-component conditional class logic.

**Alternatives considered:**
- Component-level dark classes: rejected because it would scatter theme logic and make future styling audits harder.
- Browser-only `prefers-color-scheme` without an explicit app state: rejected because users asked for dark mode, which is better served by an intentional UI preference.

### 3. Theme preference will be managed entirely on the client
Theme state should be stored in browser persistence and applied on startup without introducing backend storage or authentication dependencies. This keeps the feature aligned with the app's current local-first behavior, similar to session persistence.

**Alternatives considered:**
- Server-side persistence: rejected because the app has no user account system.
- Session-only in-memory theme: rejected because it would reset on reload and feel incomplete.

### 4. Component styling will be normalized onto shared tokens as part of the theme work
Any hardcoded light colors in transcript and player UI should be replaced with semantic variables during this change. That keeps dark mode maintainable and prevents partial theme coverage. In addition to the existing `:root` tokens, the implementation introduces new semantic variables: `--panel-bg`, `--button-bg`, `--button-hover-bg`, `--hover-bg`, `--sticky-bg`, `--error-bg`, `--warning-color`, and `--warning-bg`. The dark-mode palette for these tokens follows a warm-gray, slightly desaturated approach (inspired by Dark Reader) to reduce eye strain compared to a pure neutral-gray or inverted palette.

**Alternatives considered:**
- Add dark styles only where obviously needed: rejected because it risks unreadable surfaces and inconsistent contrast in less-visible states.

### 5. Active-word highlight uses reduced-brightness muted accent in both themes
The active word indicator changes from a solid saturated accent-color background with white text to a muted `--accent-light` background with `--text-color` foreground and a `--border-color` box-shadow outline. This prevents the active highlight from overwhelming the text in dark mode, where a saturated accent block creates excessive contrast, and produces a subtler cue that works consistently across both themes.

**Alternatives considered:**
- Keep the solid accent highlight and add a separate dark-mode override: rejected because it adds per-theme branching for a visual concern that is cleanly solved by using the already-existing `--accent-light` semantic token.
- Remove the active highlight entirely in dark mode: rejected because active-word feedback is a core interaction affordance.

## Risks / Trade-offs

- **[Risk] Transcript timestamps add visual noise** → Mitigation: style them as secondary metadata and attach them to paragraph starts rather than every word.
- **[Risk] Hardcoded colors remain in isolated components** → Mitigation: include a styling audit in implementation tasks and verify transcript, player, warning, and error surfaces in both themes.
- **[Risk] Theme flash on page load** → Mitigation: initialize theme state before or at app startup and keep the initial token application lightweight.
- **[Risk] Existing tests assume only light theme visuals** → Mitigation: add targeted UI tests for theme toggle/persistence and preserve existing selectors and interaction flows. *(Mitigated: Playwright tests for theme switching, persistence, and dark-mode contrast added in `tests/fast.spec.ts`.)*
