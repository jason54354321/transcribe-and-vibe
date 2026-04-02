"""Hardware detection — identify available compute for ASR."""

from __future__ import annotations

import platform
import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class HardwareInfo:
    device_type: str  # 'apple_silicon' | 'cuda' | 'cpu'
    device_name: str
    memory_gb: float
    engine: str  # 'mlx-whisper' | 'faster-whisper'


def _detect_apple_silicon() -> HardwareInfo | None:
    """Detect Apple Silicon with MLX support."""
    if platform.system() != 'Darwin' or platform.machine() != 'arm64':
        return None

    try:
        import mlx.core  # noqa: F401
    except ImportError:
        return None

    # Get total memory
    try:
        result = subprocess.run(
            ['sysctl', '-n', 'hw.memsize'],
            capture_output=True, text=True, check=True,
        )
        mem_bytes = int(result.stdout.strip())
        mem_gb = mem_bytes / (1024 ** 3)
    except Exception:
        mem_gb = 0.0

    chip = 'Apple Silicon'
    try:
        result = subprocess.run(
            ['sysctl', '-n', 'machdep.cpu.brand_string'],
            capture_output=True, text=True, check=True,
        )
        chip = result.stdout.strip()
    except Exception:
        pass

    return HardwareInfo(
        device_type='apple_silicon',
        device_name=chip,
        memory_gb=round(mem_gb, 1),
        engine='mlx-whisper',
    )


def _detect_cuda() -> HardwareInfo | None:
    """Detect NVIDIA GPU with CUDA."""
    try:
        import torch
        if not torch.cuda.is_available():
            return None
        name = torch.cuda.get_device_name(0)
        mem = torch.cuda.get_device_properties(0).total_mem / (1024 ** 3)
        return HardwareInfo(
            device_type='cuda',
            device_name=name,
            memory_gb=round(mem, 1),
            engine='faster-whisper',
        )
    except ImportError:
        pass

    # Fallback: check nvidia-smi
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
            capture_output=True, text=True, check=True,
        )
        line = result.stdout.strip().split('\n')[0]
        name, mem_mb = line.split(',')
        return HardwareInfo(
            device_type='cuda',
            device_name=name.strip(),
            memory_gb=round(float(mem_mb.strip()) / 1024, 1),
            engine='faster-whisper',
        )
    except Exception:
        return None


def detect_hardware() -> HardwareInfo:
    """Detect best available hardware, in priority order."""
    # Apple Silicon + MLX first (if on Mac)
    hw = _detect_apple_silicon()
    if hw:
        return hw

    # NVIDIA CUDA
    hw = _detect_cuda()
    if hw:
        return hw

    # CPU fallback
    return HardwareInfo(
        device_type='cpu',
        device_name=platform.processor() or 'Unknown CPU',
        memory_gb=0.0,
        engine='faster-whisper',
    )
