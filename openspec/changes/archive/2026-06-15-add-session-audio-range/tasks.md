## 1. Backend range support

- [x] 1.1 Parse the `Range` header on the stored-session audio endpoint and return `206 Partial Content` with a `Content-Range` header for satisfiable ranges.
- [x] 1.2 Return the full `200` body with `Accept-Ranges: bytes` when no range is requested, and `416 Range Not Satisfiable` when the start is beyond the audio length.

## 2. Verification

- [x] 2.1 Add backend tests covering `200`, `206`, and `416` responses for the stored-session audio endpoint.
- [x] 2.2 Add a Playwright test that click-to-seek works after loading a saved session.
