## Context

The current desktop layout presents the session list as a left column, but that column remains in normal document flow and scrolls away with the page. This breaks the expectation of a persistent navigation rail during long transcript review sessions. At the same time, the mobile layout already uses a fixed overlay drawer pattern, so the change needs to isolate desktop persistence without regressing the small-screen interaction model.

## Goals / Non-Goals

**Goals:**
- Keep the session sidebar persistently visible on desktop while the main content area scrolls.
- Preserve the existing mobile drawer behavior and breakpoint-specific interaction pattern.
- Make the responsive layout contract explicit enough that future UI changes can be validated in tests.

**Non-Goals:**
- Redesign the sidebar visual style, information architecture, or controls.
- Change how sessions are loaded, stored, or selected.
- Introduce new navigation patterns beyond fixing desktop persistence.

## Decisions

### Use desktop-specific persistent positioning for the sidebar
The implementation should give the desktop sidebar its own persistent viewport relationship instead of keeping it in normal flow. This can be achieved with sticky or fixed positioning, but the chosen implementation must preserve a clean two-pane layout and avoid overlap with the main content.

**Why this over leaving the current flex layout alone?**
Leaving the current layout unchanged preserves the bug: the sidebar disappears during page scrolling.

**Why this over broad layout restructuring?**
A narrow desktop-only positioning change minimizes regression risk and keeps the scope aligned with the user-visible problem.

### Keep mobile drawer behavior isolated from desktop rules
Desktop persistence rules should be applied only above the mobile breakpoint, while the current mobile fixed-drawer interaction remains intact.

**Why this over unifying desktop and mobile behavior?**
The mobile drawer already matches small-screen expectations. Replacing it would expand the scope from a bug fix into a UX redesign.

### Validate the behavior with responsive tests
The change should be backed by responsive coverage that confirms the sidebar remains accessible on desktop and that mobile still behaves like a drawer.

**Why this over relying on manual verification only?**
This regression is layout-specific and easy to reintroduce during later CSS refactors, so automated coverage provides durable protection.

## Risks / Trade-offs

- **Ancestor layout constraints can break sticky positioning** → Verify whether the existing container/overflow structure supports sticky; if not, use a fixed desktop layout with explicit content offset.
- **Persistent positioning can cause overlap or hidden content** → Ensure the main content accounts for the sidebar width and remains fully readable across desktop sizes.
- **Desktop rules may leak into mobile behavior** → Scope selectors and media queries so the existing mobile drawer transform and overlay behavior remain authoritative on small screens.
- **Independent sidebar scrolling can become awkward with many sessions** → Preserve internal sidebar overflow handling so long session lists remain usable within the persistent container.
