## Why

When GPU/backend mode is enabled, the UI still derives its model badge from the in-browser transcription flow instead of the backend's actual runtime metadata. This makes the displayed model and precision misleading right when the app is meant to reflect hardware-accelerated execution.

## What Changes

- Update the GPU transcription API contract so backend transcription streams expose the actual model ID and precision used for the active job.
- Update the frontend transcription client contract so backend mode maps that metadata into the same `modelInfo` state already used by the worker flow.
- Add backend integration coverage for the model badge so GPU mode verifies the displayed model and precision come from backend results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `gpu-transcription-api`: Backend SSE responses and final result metadata must expose the actual model and precision used for a transcription job.
- `transcription-client`: Backend mode must populate the shared model-info UI state from backend metadata and keep upload parameters aligned with the selected backend model.

## Impact

- Affected backend code: `backend/main.py`, `backend/engine/__init__.py`, `backend/engine/faster_whisper_engine.py`, `backend/engine/mlx_whisper_engine.py`
- Affected frontend code: `src/App.vue`, `src/composables/useBackendTranscriber.ts`, `src/components/StatusBar.vue`
- Affected tests: `tests/backend.spec.ts`
- Affected specs: `openspec/specs/gpu-transcription-api/spec.md`, `openspec/specs/transcription-client/spec.md`
