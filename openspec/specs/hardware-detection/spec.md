## Purpose

Define the canonical requirements for automatic compute hardware detection at backend startup, including Apple Silicon, NVIDIA GPU, and CPU-only fallback.

## Requirements

### Requirement: Auto-detect compute hardware at startup
The system SHALL detect available compute hardware when the backend starts. Detection SHALL identify: Apple Silicon (MPS via MLX), NVIDIA GPU (CUDA via torch), or CPU-only. The detected hardware SHALL determine which ASR engine is used.

#### Scenario: Apple Silicon detected
- **WHEN** backend starts on a Mac with Apple Silicon
- **THEN** system detects MPS and selects mlx-whisper as the ASR engine

#### Scenario: NVIDIA GPU detected
- **WHEN** backend starts on a machine with NVIDIA GPU and CUDA installed
- **THEN** system detects CUDA and selects faster-whisper as the ASR engine

#### Scenario: No GPU detected
- **WHEN** backend starts on a machine with no GPU or no CUDA/MPS
- **THEN** system falls back to CPU mode using faster-whisper with `device="cpu"`

### Requirement: Hardware info endpoint
The system SHALL expose a `GET /api/info` endpoint that returns the detected hardware, selected engine, loaded model, and available models.

#### Scenario: Query system info
- **WHEN** client sends `GET /api/info`
- **THEN** server responds with JSON: `{ "hardware": "apple_silicon", "engine": "mlx-whisper", "model": "large-v3-turbo", "availableModels": [...] }`
