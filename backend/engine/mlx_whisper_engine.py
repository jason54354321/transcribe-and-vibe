"""mlx-whisper engine — Apple Silicon MLX-based Whisper."""

from __future__ import annotations

import gc
import logging
import platform
import threading
import time
from collections.abc import Mapping

from engine import TranscribeResult, TranscriptionEngine, ProgressCallback
from models import MLX_REPOS, get_model

logger = logging.getLogger(__name__)

_IDLE_TTL_SEC = 60.0


class MlxWhisperEngine(TranscriptionEngine):
    def __init__(self) -> None:
        self._idle_lock = threading.Lock()
        self._idle_timer: threading.Timer | None = None
        self._active = 0

    def _begin_use(self) -> None:
        with self._idle_lock:
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None
            self._active += 1

    def _end_use(self) -> None:
        with self._idle_lock:
            self._active = max(0, self._active - 1)
            if self._active == 0:
                self._idle_timer = threading.Timer(_IDLE_TTL_SEC, self._on_idle)
                self._idle_timer.daemon = True
                self._idle_timer.start()

    def _on_idle(self) -> None:
        with self._idle_lock:
            if self._active > 0:
                return
            self._idle_timer = None
            self._release_model()

    def _release_model(self) -> None:
        import mlx.core as mx
        from mlx_whisper.transcribe import ModelHolder

        if ModelHolder.model is None:
            return
        t0 = time.perf_counter()
        ModelHolder.model = None
        ModelHolder.model_path = None
        gc.collect()
        # MLX keeps freed buffers in a process-wide cache; clearing it returns the memory to the OS
        mx.clear_cache()
        logger.info(f'MLX model released after idle in {time.perf_counter() - t0:.2f}s')

    def engine_name(self) -> str:
        return 'mlx-whisper'

    def execution_backend(self) -> str:
        return 'mlx'

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
        on_progress: ProgressCallback | None = None,
    ) -> TranscribeResult:
        config = get_model(model_id)
        repo = MLX_REPOS.get(model_id)
        dtype = config.default_compute_type
        if not repo:
            raise ValueError(f'No MLX model repo for {model_id}. Available: {list(MLX_REPOS.keys())}')

        if on_progress:
            on_progress('model-loading', {'status': f'Loading {config.label} (MLX)...'})
            on_progress('model-info', {
                'model': model_id,
                'dtype': dtype,
                'engine': self.engine_name(),
                'execution_backend': self.execution_backend(),
            })

        logger.info(f'Transcribing with mlx-whisper: {repo}')

        if on_progress:
            on_progress('transcribing', {'status': 'Transcribing...'})

        self._begin_use()
        try:
            return self._transcribe(audio_path, repo, model_id, dtype, on_progress)
        finally:
            self._end_use()

    def _transcribe(
        self,
        audio_path: str,
        repo: str,
        model_id: str,
        dtype: str,
        on_progress: ProgressCallback | None,
    ) -> TranscribeResult:
        import mlx_whisper

        result_data: Mapping[str, object] = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=repo,
            word_timestamps=True,
        )

        segments_obj = result_data.get('segments', [])
        segments = segments_obj if isinstance(segments_obj, list) else []
        total_segments = len(segments)

        if on_progress and total_segments > 0:
            on_progress('transcription-progress', {
                'completed_chunks': 0,
                'total_chunks': total_segments,
            })

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
                on_progress('transcription-progress', {
                    'completed_chunks': i + 1,
                    'total_chunks': total_segments,
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

        return TranscribeResult(
            text=full_text,
            chunks=all_words,
            model=model_id,
            dtype=dtype,
            engine=self.engine_name(),
            execution_backend=self.execution_backend(),
        )
