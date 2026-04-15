## 1. Responsive regression coverage

- [x] 1.1 Add or update automated coverage that verifies the desktop sidebar remains visible while long main-content pages scroll.
- [x] 1.2 Add or update automated coverage that verifies the mobile session sidebar still behaves like a drawer rather than a permanently visible rail.

## 2. Desktop sidebar persistence

- [x] 2.1 Update the desktop layout in `src/App.vue` and/or `src/components/SessionList.vue` so the sidebar remains persistently visible while the main content scrolls.
- [x] 2.2 Ensure the persistent desktop sidebar still handles long session lists without hiding session access or overlapping the main content.

## 3. Verification

- [x] 3.1 Run `npm run build` to confirm the responsive layout change type-checks and bundles successfully.
- [x] 3.2 Run the relevant automated tests to verify desktop persistence and preserved mobile drawer behavior.
