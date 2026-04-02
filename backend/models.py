"""Model registry — maps model IDs to engine configuration."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ModelConfig:
    model_id: str
    label: str
    hf_repo: str
    engines: list[str]  # 'faster-whisper' | 'mlx-whisper'
    default_compute_type: str = 'int8'
    vram_mb: int = 0
    word_timestamps: bool = True
    description: str = ''


# Extensible registry — add entries here to support new models
MODELS: dict[str, ModelConfig] = {
    'large-v3-turbo': ModelConfig(
        model_id='large-v3-turbo',
        label='Large V3 Turbo',
        hf_repo='deepdml/faster-whisper-large-v3-turbo-ct2',
        engines=['faster-whisper', 'mlx-whisper'],
        default_compute_type='int8',
        vram_mb=1500,
        description='Best speed/accuracy tradeoff (~7.8% WER)',
    ),
    'large-v3': ModelConfig(
        model_id='large-v3',
        label='Large V3',
        hf_repo='Systran/faster-whisper-large-v3',
        engines=['faster-whisper', 'mlx-whisper'],
        default_compute_type='float16',
        vram_mb=3000,
        description='Best accuracy (~6.5% WER), slower',
    ),
    'small': ModelConfig(
        model_id='small',
        label='Small',
        hf_repo='Systran/faster-whisper-small',
        engines=['faster-whisper', 'mlx-whisper'],
        default_compute_type='int8',
        vram_mb=500,
        description='Lightweight (~10% WER)',
    ),
    'base': ModelConfig(
        model_id='base',
        label='Base',
        hf_repo='Systran/faster-whisper-base',
        engines=['faster-whisper', 'mlx-whisper'],
        default_compute_type='int8',
        vram_mb=200,
        description='Fastest, lowest accuracy (~13% WER)',
    ),
}

# MLX model repos (Apple Silicon only)
MLX_REPOS: dict[str, str] = {
    'large-v3-turbo': 'mlx-community/whisper-large-v3-turbo',
    'large-v3': 'mlx-community/whisper-large-v3-mlx',
    'small': 'mlx-community/whisper-small-mlx',
    'base': 'mlx-community/whisper-base-mlx',
}


def get_model(model_id: str) -> ModelConfig:
    if model_id not in MODELS:
        raise ValueError(f'Unknown model: {model_id}. Available: {list(MODELS.keys())}')
    return MODELS[model_id]


def get_default_model(has_gpu: bool) -> str:
    return 'large-v3-turbo' if has_gpu else 'base'


def list_models() -> list[dict]:
    return [
        {
            'id': m.model_id,
            'label': m.label,
            'description': m.description,
            'vram_mb': m.vram_mb,
        }
        for m in MODELS.values()
    ]
