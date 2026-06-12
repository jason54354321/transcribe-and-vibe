## 1. Frontend orchestration cleanup

- [x] 1.1 Remove frontend mode-switching and worker-based transcription flow so `App.vue` and related composables use the backend transcriber as the only transcription path.
- [x] 1.2 Remove browser-only transcription assets and controls that are no longer valid, including the Worker entry, frontend model config, and any UI/state derived from in-browser ASR fallback.
- [x] 1.3 Update backend availability UX so page load and transcription-time failures clearly state that transcription requires the backend service and no browser fallback is attempted.
- [x] 1.4 Add a transcription info area that shows detected architecture, active model, and current execution backend (`CUDA` / `MLX` / `CPU`) using backend-provided metadata.

## 2. Backend CPU-mode productization

- [x] 2.1 Update backend info/default-model handling so machines without MLX or CUDA automatically fall back to CPU and expose a CPU-safe default model through `/api/info` and transcription metadata.
- [x] 2.2 Extend backend runtime metadata so the frontend can show detected architecture, active model, and actual execution backend for each transcription session.
- [x] 2.3 Review backend-facing status/error messages to ensure CPU fallback is presented as a supported mode rather than an implicit failure path.

## 3. Test and fixture migration

- [x] 3.1 Replace fast test assumptions that mock the Worker path with backend/SSE-oriented fixtures or mocks that reflect the new single-path contract.
- [x] 3.2 Update or add coverage for backend-unavailable behavior so tests verify the blocking error/banner instead of browser fallback.
- [x] 3.3 Add coverage for the transcription info area so tests verify architecture, model, and execution backend are rendered from backend metadata.
- [x] 3.4 Verify existing backend-oriented transcript rendering flows still pass with the backend-only orchestration.

## 4. Verification

- [x] 4.1 Run `bun run build` to verify the frontend type-check and production build after removing the worker path.
- [x] 4.2 Run the relevant unit and Playwright test suites for the updated backend-only transcription flow.
