## ADDED Requirements

### Requirement: Backend transcription-model memory lifecycle
The backend SHALL release a loaded transcription model's memory when the model is no longer in active use, so an idle backend does not hold a multi-gigabyte model resident indefinitely. The backend MAY keep a model warm to serve back-to-back transcriptions without reloading it from disk, but SHALL release the model after a bounded idle period. For the MLX engine, releasing the model SHALL return its memory to the operating system — dropping the loaded-model reference, running garbage collection, and clearing the MLX buffer cache — rather than only dropping references. For the faster-whisper engine, the model SHALL be released after each transcription completes.

#### Scenario: MLX model released after idle period
- **WHEN** the MLX engine has finished a transcription and no further transcription starts within the configured idle period
- **THEN** the backend releases the loaded model and returns its memory to the OS so MLX active and cache memory drop back to baseline

#### Scenario: Warm model reused within idle window
- **WHEN** a second transcription starts on the MLX engine before the idle period elapses
- **THEN** the backend reuses the already-loaded model instance without reloading it from disk

#### Scenario: faster-whisper model released after each transcription
- **WHEN** a faster-whisper transcription completes, whether it succeeds or fails
- **THEN** the model is released and garbage-collected before the next request
