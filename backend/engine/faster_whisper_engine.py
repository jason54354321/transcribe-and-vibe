"""faster-whisper engine — CTranslate2-based Whisper for CUDA and CPU."""

from __future__ import annotations

import gc
import logging
import time

from engine import TranscribeResult, TranscriptionEngine, ProgressCallback
from models import get_model

logger = logging.getLogger(__name__)


class FasterWhisperEngine(TranscriptionEngine):
    def __init__(self, device: str = 'auto', compute_type: str | None = None):
        """
        Args:
            device: 'cuda', 'cpu', or 'auto'
            compute_type: 'int8', 'float16', 'float32', or None (auto from model config)
        """
        self._device = device
        self._compute_type = compute_type

    def engine_name(self) -> str:
        return 'faster-whisper'

    def execution_backend(self) -> str:
        return self._device

    def is_available(self) -> bool:
        try:
            import faster_whisper  # noqa: F401
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
        compute = self._compute_type or config.default_compute_type

        if on_progress:
            on_progress('model-loading', {'status': f'Loading {config.label}...'})

        logger.info(f'Loading faster-whisper model: {model_id} (device={self._device}, compute={compute})')
        t_load = time.perf_counter()
        from faster_whisper import WhisperModel
        model = WhisperModel(
            model_id,
            device=self._device,
            compute_type=compute,
        )
        logger.info(f'Model {model_id} loaded in {time.perf_counter() - t_load:.2f}s')

        try:
            if on_progress:
                on_progress('model-info', {
                    'model': model_id,
                    'dtype': compute,
                    'engine': self.engine_name(),
                    'execution_backend': self.execution_backend(),
                })

            if on_progress:
                on_progress('transcribing', {'status': 'Transcribing...'})

            segments_gen, info = model.transcribe(
                audio_path,
                word_timestamps=True,
                vad_filter=True,
                beam_size=5,
            )

            segments = list(segments_gen)

            logger.info(f'Detected language: {info.language} (prob={info.language_probability:.2f})')
            duration = info.duration if info.duration > 0 else 1
            total_segments = len(segments)

            if on_progress and total_segments > 0:
                on_progress('transcription-progress', {
                    'completed_chunks': 0,
                    'total_chunks': total_segments,
                })

            all_words = []
            for i, segment in enumerate(segments):
                if on_progress:
                    pct = min(int((segment.end / duration) * 100), 99)
                    on_progress('transcribing', {
                        'status': f'Transcribing... {pct}%',
                        'progress': pct,
                    })
                    on_progress('transcription-progress', {
                        'completed_chunks': i + 1,
                        'total_chunks': total_segments,
                    })

                if segment.words:
                    for word in segment.words:
                        all_words.append({
                            'text': word.word,
                            'timestamp': [round(word.start, 2), round(word.end, 2)],
                        })

            full_text = ''.join(w['text'] for w in all_words)

            return TranscribeResult(
                text=full_text,
                chunks=all_words,
                model=model_id,
                dtype=compute,
                engine=self.engine_name(),
                execution_backend=self.execution_backend(),
            )
        finally:
            t_free = time.perf_counter()
            del model
            gc.collect()
            logger.info(f'Model {model_id} released in {time.perf_counter() - t_free:.2f}s')
