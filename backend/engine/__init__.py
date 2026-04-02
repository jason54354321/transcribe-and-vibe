"""Transcription engine — abstract interface and concrete implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable


@dataclass
class TranscribeWord:
    text: str
    start: float  # seconds
    end: float  # seconds


@dataclass
class TranscribeResult:
    text: str
    chunks: list[dict]  # [{ text: str, timestamp: [float, float] }]

    def to_dict(self) -> dict:
        return {'text': self.text, 'chunks': self.chunks}


ProgressCallback = Callable[[str, dict], None]
"""Callback signature: (event_type, data_dict)"""


class TranscriptionEngine(ABC):
    """Abstract base for ASR engines (faster-whisper, mlx-whisper, etc.)."""

    @abstractmethod
    def transcribe(
        self,
        audio_path: str,
        model_id: str,
        use_vad: bool = True,
        on_progress: ProgressCallback | None = None,
    ) -> TranscribeResult:
        """Transcribe audio file, returning result with word-level timestamps."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this engine can run on the current hardware."""
        ...

    @abstractmethod
    def engine_name(self) -> str:
        ...
