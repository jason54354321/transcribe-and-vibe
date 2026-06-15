## 1. MLX idle model release

- [x] 1.1 Track active transcriptions and arm a self-cancelling idle timer on the MLX engine so the loaded model is released after a bounded idle period.
- [x] 1.2 Implement the release sequence so memory returns to the OS: drop the `mlx_whisper` `ModelHolder` singleton, run `gc.collect()`, and call `mx.clear_cache()`.
- [x] 1.3 Keep the model warm for back-to-back transcriptions within the idle window by cancelling the pending timer when a new transcription starts.

## 2. Verification

- [x] 2.1 Verify idle release empirically: after the idle period the MLX active and cache memory drop to baseline and `ModelHolder.model` is `None`.
- [x] 2.2 Verify warm reuse: a second transcription within the idle window reuses the same loaded model instance without reloading.
- [x] 2.3 Run the existing backend test suite to confirm no regression.
