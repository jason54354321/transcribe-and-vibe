## Purpose

Define the canonical requirements for the extensible model registry that maps model IDs to their configuration, including engine compatibility, resource requirements, and default model selection per hardware.

## Requirements

### Requirement: Extensible model configuration
The system SHALL maintain a model registry mapping model IDs to their configuration. Each model entry SHALL specify: HuggingFace model ID, compatible engines (mlx-whisper, faster-whisper), quantization options, expected VRAM, and supported features (word timestamps, language detection). The registry SHALL be defined in Python code and extensible by adding entries.

#### Scenario: Registry lists available models
- **WHEN** backend initializes and reads the model registry
- **THEN** all configured models are available for selection, each with engine compatibility and resource requirements

#### Scenario: Add a new model
- **WHEN** developer adds a new model entry to the registry
- **THEN** the model becomes available for transcription without other code changes

### Requirement: Default model per hardware
The system SHALL select a sensible default model based on detected hardware. Apple Silicon with >=16GB: `large-v3-turbo`. NVIDIA with >=4GB VRAM: `large-v3-turbo` (int8). CPU-only: `base` or `small` (fastest inference).

#### Scenario: Default on Apple Silicon 16GB
- **WHEN** system detects Apple Silicon with 16GB unified memory
- **THEN** default model is `large-v3-turbo`

#### Scenario: Default on CPU-only
- **WHEN** system detects no GPU
- **THEN** default model is `base` or `small` for acceptable inference speed
