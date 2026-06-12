## MODIFIED Requirements

### Requirement: Auto-detect compute hardware at startup
The system SHALL detect available compute hardware when the backend starts. Detection SHALL identify Apple Silicon (MPS via MLX), NVIDIA GPU (CUDA via torch), or CPU-only. The detected hardware SHALL determine which ASR engine is used, and when no MLX or CUDA acceleration is available the backend SHALL automatically fall back to CPU execution as a supported operating mode.

#### Scenario: Apple Silicon detected
- **WHEN** backend starts on a Mac with Apple Silicon
- **THEN** system detects MPS and selects mlx-whisper as the ASR engine

#### Scenario: NVIDIA GPU detected
- **WHEN** backend starts on a machine with NVIDIA GPU and CUDA installed
- **THEN** system detects CUDA and selects faster-whisper as the ASR engine

#### Scenario: No GPU detected
- **WHEN** backend starts on a machine with no GPU or no CUDA/MPS
- **THEN** system selects faster-whisper with `device="cpu"` as a supported backend execution mode

### Requirement: Hardware info endpoint
The system SHALL expose a `GET /api/info` endpoint that returns the detected hardware, selected engine, default model, and available models. The response SHALL allow the frontend to distinguish CPU-only execution from GPU-backed execution so it can present accurate user messaging and populate the transcription runtime info area.

#### Scenario: Query system info on Apple Silicon
- **WHEN** client sends `GET /api/info` to a backend running on Apple Silicon
- **THEN** server responds with JSON including hardware and engine metadata such as `{ "hardware": "apple_silicon", "engine": "mlx-whisper", "default_model": "large-v3-turbo", "available_models": [...] }`

#### Scenario: Query system info on CPU-only machine
- **WHEN** client sends `GET /api/info` to a backend running on a machine without GPU acceleration
- **THEN** server responds with JSON including CPU-oriented metadata such as `{ "hardware": "cpu", "engine": "faster-whisper", "default_model": "base", "available_models": [...] }`
