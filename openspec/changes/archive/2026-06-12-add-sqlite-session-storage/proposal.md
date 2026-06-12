## Why

Transcription sessions are currently stored in the browser via IndexedDB, which ties saved transcripts, audio, and metadata to a single browser profile and is lost when site data is cleared. The backend is already a hard requirement for transcription, so persisting sessions server-side in SQLite gives durable, portable storage without adding a new dependency.

## What Changes

- Add a backend SQLite session store (stdlib `sqlite3`) that persists session metadata, the transcript, and the original audio.
- Expose REST endpoints for saving, listing, loading, retrieving audio for, and deleting sessions.
- Replace the browser IndexedDB session store with calls to the backend REST API, streaming audio from the backend instead of holding it as a client-side blob.
- Remove the now-unused `idb` dependency from the frontend.

## Capabilities

### New Capabilities
- `session-storage`: Server-side persistence of transcription sessions (metadata, transcript, audio) accessible over REST and durable across reloads and browsers.

### Modified Capabilities
- None.

## Impact

- Affected backend: new `backend/storage.py`, new session REST endpoints in `backend/main.py`, `backend/.gitignore`.
- Affected frontend: `src/composables/useSessionStore.ts`, `src/composables/useSessionOrchestration.ts`, `src/composables/useStickyAudio.ts`, `package.json`.
- Affected specs: new `openspec/specs/session-storage/spec.md`.
- Expected testing impact: new backend storage round-trip test; Playwright fast suite mocks extended to back session endpoints with localStorage.
- The transcription SSE contract and `TranscribeResult` shape are unchanged.
