## Why

MLX 引擎把載入的 Whisper 模型放在 `mlx_whisper` 的 module 級 singleton (`ModelHolder`) 裡，轉錄結束後不會釋放，導致後端程序即使閒置也持續佔用數 GB 記憶體（large-v3 約 3GB，實測常駐 4.26GB）。faster-whisper 引擎本來就會在每次轉錄後釋放模型，兩條路徑行為不一致。需要一個明確的模型記憶體生命週期規範，讓閒置時記憶體可以還給作業系統，同時不犧牲連續轉錄的體感。

## What Changes

- Define a backend model memory lifecycle: a loaded transcription model MAY stay warm for reuse, but MUST be released once it is no longer in active use.
- For the MLX engine, keep the model warm for back-to-back transcriptions, then release it after a bounded idle period; releasing MUST return memory to the OS (drop the `ModelHolder` singleton, run GC, and clear the MLX buffer cache) rather than only dropping references.
- Preserve the faster-whisper engine's existing behavior of releasing and garbage-collecting the model after each transcription.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `audio-transcription`: Add a requirement covering backend transcription-model memory lifecycle (warm reuse plus bounded idle release) so idle backends do not hold multi-gigabyte models resident.

## Impact

- **Backend**: `engine/mlx_whisper_engine.py` gains a self-cancelling idle timer that releases the model after 60s of inactivity; `engine/faster_whisper_engine.py` keeps its per-transcription release.
- **User experience**: Idle backend memory returns to baseline; the first transcription after an idle gap pays a short model reload (~1.5s for large-v3 from local cache), while transcriptions within the idle window reuse the warm model.
