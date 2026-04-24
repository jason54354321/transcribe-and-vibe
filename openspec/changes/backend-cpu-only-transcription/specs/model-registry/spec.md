## MODIFIED Requirements

### Requirement: Default model per hardware
The system SHALL select a sensible default model based on detected hardware. Apple Silicon with >=16GB: `large-v3-turbo`. NVIDIA with >=4GB VRAM: `large-v3-turbo` (int8). CPU-only: a CPU-safe default such as `base` or `small`, chosen to keep inference time usable on machines without GPU acceleration.

#### Scenario: Default on Apple Silicon 16GB
- **WHEN** system detects Apple Silicon with 16GB unified memory
- **THEN** default model is `large-v3-turbo`

#### Scenario: Default on CPU-only
- **WHEN** system detects no GPU
- **THEN** default model is a CPU-safe option such as `base` or `small` rather than a GPU-oriented large model

## ADDED Requirements

### Requirement: CPU-safe defaults are reflected in backend metadata
The model registry SHALL expose the effective default model chosen for the detected hardware through backend metadata so the frontend can explain CPU-only execution clearly.

#### Scenario: CPU-safe default exposed to client
- **WHEN** backend starts on a CPU-only machine
- **THEN** the info returned to the frontend identifies a CPU-safe default model that matches the registry's CPU-only selection
