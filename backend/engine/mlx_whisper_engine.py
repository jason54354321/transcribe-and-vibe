"""mlx-whisper engine — Apple Silicon MLX-based Whisper."""

from __future__ import annotations

import logging
import platform

from engine import TranscribeResult, TranscriptionEngine, ProgressCallback
from models import MLX_REPOS, get_model

logger = logging.getLogger(__name__)


class MlxWhisperEngine(TranscriptionEngine):
    def engine_name(self) -> str:
        return 'mlx-whisper'

    def is_available(self) -> bool:
        if platform.system() != 'Darwin' or platform.machine() != 'arm64':
            return False
        try:
            import mlx_whisper  # noqa: F401
            return True
        except ImportError:
            return False

    def transcribe(
        self,
        audio_path: str,
        model_id: str,
        use_vad: bool = True,
        on_progress: ProgressCallback | None = None,
    ) -> TranscribeResult:
        import mlx_whisper

        config = get_model(model_id)
        repo = MLX_REPOS.get(model_id)
        if not repo:
            raise ValueError(f'No MLX model repo for {model_id}. Available: {list(MLX_REPOS.keys())}')

        if on_progress:
            on_progress('model-loading', {'status': f'Loading {config.label} (MLX)...'})

        logger.info(f'Transcribing with mlx-whisper: {repo}')

        if on_progress:
            on_progress('transcribing', {'status': 'Transcribing...'})

        result = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=repo,
            word_timestamps=True,
        )

        segments = result.get('segments', [])
        total_segments = len(segments)
        all_words = []

        for i, segment in enumerate(segments):
            if on_progress and total_segments > 0:
                pct = min(int(((i + 1) / total_segments) * 100), 99)
                on_progress('transcribing', {
                    'status': f'Transcribing... {pct}%',
                    'progress': pct,
                })

            words = segment.get('words', [])
            for w in words:
                all_words.append({
                    'text': w.get('word', w.get('text', '')),
                    'timestamp': [round(w['start'], 2), round(w['end'], 2)],
                })

        full_text = result.get('text', '').strip()

        return TranscribeResult(text=full_text, chunks=all_words)
