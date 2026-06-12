## 1. Backend storage

- [x] 1.1 Add `backend/storage.py` SQLite store with init/save/list/get/get_audio/delete using parameterized queries.
- [x] 1.2 Initialize the store during backend lifespan startup and add session REST endpoints before the SPA mount.
- [x] 1.3 Ignore SQLite database files in `backend/.gitignore`.
- [x] 1.4 Add `backend/test_storage.py` round-trip test runnable without transcription dependencies.

## 2. Frontend integration

- [x] 2.1 Rewrite `src/composables/useSessionStore.ts` to call the backend REST API instead of IndexedDB.
- [x] 2.2 Update `src/composables/useSessionOrchestration.ts` and `src/composables/useStickyAudio.ts` for the backend audio URL.
- [x] 2.3 Remove the unused `idb` dependency and all imports.

## 3. Tests

- [x] 3.1 Extend Playwright mock backend with localStorage-backed session endpoints.
- [x] 3.2 Reseed `tests/fast/sessions.spec.ts` against the mock store and keep all fast specs green.

## 4. Verification

- [x] 4.1 Run build, lint, fast Playwright suite, unit tests, and the backend storage test until green.
