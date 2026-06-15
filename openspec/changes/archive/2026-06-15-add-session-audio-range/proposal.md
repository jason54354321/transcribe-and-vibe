## Why

After loading a saved session, click-to-seek on the transcript was broken: the backend audio endpoint returned the whole file with a plain `200` and no `Accept-Ranges`, so the browser audio element could not seek into a stored session's audio. Seeking requires the server to honor HTTP range requests.

## What Changes

- Make the stored-session audio endpoint support HTTP range requests: advertise `Accept-Ranges: bytes`, return `206 Partial Content` with a `Content-Range` header for a satisfiable range, return the full `200` body when no range is requested, and return `416 Range Not Satisfiable` when the requested start is beyond the audio length.
- Restore click-to-seek playback for audio served from a stored session.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `session-storage`: Require the stored-audio endpoint to honor HTTP range requests so playback and click-to-seek work on loaded sessions.

## Impact

- **Backend**: `main.py` stored-session audio endpoint gains range parsing and `206`/`416` responses.
- **Tests**: backend `test_api_audio.py` covers `200`/`206`/`416`; Playwright `backend.spec.ts` covers click-to-seek on a loaded session.
- **User experience**: clicking a word in a loaded session seeks and plays from that point instead of failing silently.
