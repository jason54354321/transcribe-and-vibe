## 1. Backend metadata plumbing

- [x] 1.1 Extend backend transcription result metadata so engine results carry the actual `model` and `dtype` used for a job.
- [x] 1.2 Update backend SSE/result serialization to emit `model-info` and include `model`/`dtype` in the final `result` payload.

## 2. Frontend backend-mode display alignment

- [x] 2.1 Update backend transcription requests to send the selected backend model and map backend `model-info` metadata into the shared frontend `modelInfo` state.
- [x] 2.2 Preserve backend-reported model and precision through the final result flow so the status badge reflects actual backend execution.

## 3. Verification

- [x] 3.1 Add or update backend integration coverage for the model badge in GPU mode.
- [x] 3.2 Run build and relevant backend/frontend tests to verify the new metadata flow end to end.
