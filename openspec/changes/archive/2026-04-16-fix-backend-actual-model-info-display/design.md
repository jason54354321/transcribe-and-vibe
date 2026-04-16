## Context

The app already has a shared `StatusBar` badge that renders `modelInfo.model` and `modelInfo.dtype`, but only the in-browser worker flow ever populates that state. In backend mode, `App.vue` switches to `useBackendTranscriber`, which uploads audio over `POST /api/transcribe` yet never receives or stores backend-actual model metadata, so the GPU path cannot truthfully render the active model and precision.

The affected flow crosses both backend and frontend modules. The backend engines know the model ID and runtime precision, `backend/main.py` owns the SSE contract, and `useBackendTranscriber.ts` owns the frontend mapping into the shared reactive state consumed by `StatusBar.vue`.

## Goals / Non-Goals

**Goals:**
- Make backend mode surface the actual backend model ID and runtime precision to the existing UI badge.
- Keep worker mode and backend mode aligned on a shared `modelInfo` shape so `StatusBar` does not need mode-specific rendering logic.
- Ensure backend transcription requests continue to use the user-selected backend model rather than silently falling back to defaults.
- Add backend integration coverage that proves the GPU badge is sourced from backend metadata.

**Non-Goals:**
- Introduce backend-side precision selection controls in the UI.
- Redesign `StatusBar.vue` or the model selector UI.
- Change existing worker-mode model or quantization behavior.

## Decisions

### Decision: Extend backend transcription metadata at the API boundary
The backend will expose `model` and `dtype` as part of the transcription metadata emitted during GPU mode. This will be attached to the final `result` payload and also emitted as a dedicated `model-info` SSE event near the start of transcription.

Rationale:
- A dedicated `model-info` event lets the badge appear early, before the final transcript arrives.
- Duplicating the same metadata in the final `result` payload makes the contract resilient if the frontend misses an earlier stream event or restores state from the terminal event only.

Alternatives considered:
- **Only include metadata in the final `result` event**: simpler, but the badge would remain empty until transcription finishes.
- **Only include metadata in `/api/info`**: incorrect because `/api/info` describes available/default models, not the actual model used for a specific transcription job.

### Decision: Carry runtime metadata through `TranscribeResult`
`backend/engine/__init__.py` will extend `TranscribeResult` with `model` and `dtype`, and each concrete engine will populate those fields from the actual execution path.

Rationale:
- The actual model and precision are determined at the engine layer, so keeping the source of truth there avoids duplicating inference-specific logic in the API layer.
- `backend/main.py` can continue to serialize one result object without reconstructing metadata out of band.

Alternatives considered:
- **Compute metadata only in `backend/main.py` from query params**: insufficient because it cannot guarantee the runtime precision value, especially across MLX and faster-whisper.

### Decision: Normalize backend metadata into the existing frontend `ModelInfo`
`useBackendTranscriber.ts` will handle the new `model-info` SSE event and also set `modelInfo` from the final `result` payload. `App.vue` will pass `selectedModel.value` into backend transcription so the backend request path stays aligned with the visible selection.

Rationale:
- This preserves a single UI contract for `StatusBar.vue`.
- It fixes the adjacent drift where backend mode ignored the selected model during upload.

Alternatives considered:
- **Create a backend-specific badge state**: unnecessary duplication that would diverge from the existing worker path.

### Decision: Show backend precision as backend-native terminology
The UI will display the backend-reported precision string verbatim, such as `int8`, `float16`, or an MLX-specific value, instead of mapping it into the worker-mode quantization labels.

Rationale:
- The user asked for the actual backend-available version, not a translated approximation.
- Mapping backend precision into frontend quantization labels risks overstating accuracy where the semantics do not match exactly.

## Risks / Trade-offs

- **[Backend precision naming differs from worker quantization labels]** → Display backend-native values verbatim and document that backend mode shows runtime precision, not worker quantization presets.
- **[MLX may not expose a richer precision signal than a stable default]** → Define a deterministic engine-specific `dtype` value in the MLX engine and keep the spec focused on showing the backend-actual reported value.
- **[Frontend may rely on old result shape]** → Add metadata fields in a backward-compatible way by extending the result object instead of changing `text` or `chunks`.
- **[Badge remains blank if only early SSE metadata is processed]** → Duplicate metadata in the final `result` payload so the frontend can recover from either event source.
