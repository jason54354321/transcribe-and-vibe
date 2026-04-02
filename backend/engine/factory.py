"""Engine factory — select engine based on detected hardware."""

from __future__ import annotations

import logging

from engine import TranscriptionEngine
from engine.hardware import HardwareInfo
from engine.mlx_whisper_engine import MlxWhisperEngine
from engine.faster_whisper_engine import FasterWhisperEngine

logger = logging.getLogger(__name__)


def create_engine(hardware: HardwareInfo) -> TranscriptionEngine:
    """Create the best available engine for the detected hardware."""

    if hardware.engine == 'mlx-whisper':
        engine = MlxWhisperEngine()
        if engine.is_available():
            logger.info('Using mlx-whisper engine (Apple Silicon)')
            return engine
        logger.warning('mlx-whisper not available, falling back to faster-whisper')

    # faster-whisper for CUDA or CPU
    device = 'cuda' if hardware.device_type == 'cuda' else 'cpu'
    engine = FasterWhisperEngine(device=device)
    if engine.is_available():
        logger.info(f'Using faster-whisper engine (device={device})')
        return engine

    raise RuntimeError(
        'No ASR engine available. Install faster-whisper: pip install faster-whisper'
    )
