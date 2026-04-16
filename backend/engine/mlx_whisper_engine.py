"""mlx-whisper engine — Apple Silicon MLX-based Whisper."""

from __future__ import annotations

import logging
import platform
from collections.abc import Mapping

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
        dtype = config.default_compute_type
        if not repo:
            raise ValueError(f'No MLX model repo for {model_id}. Available: {list(MLX_REPOS.keys())}')

        if on_progress:
            on_progress('model-loading', {'status': f'Loading {config.label} (MLX)...'})
            on_progress('model-info', {'model': model_id, 'dtype': dtype})

        logger.info(f'Transcribing with mlx-whisper: {repo}')

        if on_progress:
            on_progress('transcribing', {'status': 'Transcribing...'})

        result_data: Mapping[str, object] = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=repo,
            word_timestamps=True,
        )

        segments_obj = result_data.get('segments', [])
        segments = segments_obj if isinstance(segments_obj, list) else []
        total_segments = len(segments)
        all_words = []

        for i, segment in enumerate(segments):
            if not isinstance(segment, dict):
                continue

            if on_progress and total_segments > 0:
                pct = min(int(((i + 1) / total_segments) * 100), 99)
                on_progress('transcribing', {
                    'status': f'Transcribing... {pct}%',
                    'progress': pct,
                })

            words_obj = segment.get('words', [])
            words = words_obj if isinstance(words_obj, list) else []
            for w in words:
                if not isinstance(w, dict):
                    continue

                word_text = w.get('word', w.get('text', ''))
                word_start = w.get('start')
                word_end = w.get('end')
                if not isinstance(word_text, str) or not isinstance(word_start, (int, float)) or not isinstance(word_end, (int, float)):
                    continue

                all_words.append({
                    'text': word_text,
                    'timestamp': [round(word_start, 2), round(word_end, 2)],
                })

        text_obj = result_data.get('text', '')
        full_text = text_obj.strip() if isinstance(text_obj, str) else ''

        return TranscribeResult(text=full_text, chunks=all_words, model=model_id, dtype=dtype)
