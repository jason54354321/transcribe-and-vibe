"""FastAPI backend for GPU-accelerated audio transcription."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import queue
import tempfile
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from engine import TranscriptionEngine
from engine.hardware import HardwareInfo, detect_hardware
from engine.factory import create_engine
from models import get_default_model, get_model, list_models

DIST_DIR = Path(__file__).resolve().parent.parent / 'dist'

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(message)s')
logger = logging.getLogger(__name__)

VALID_AUDIO_TYPES = {
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/ogg', 'audio/webm',
    'audio/flac', 'audio/x-flac',
}
VALID_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'}
MAX_FILE_SIZE = 100 * 1024 * 1024

_SENTINEL = None

hardware: HardwareInfo | None = None
engine: TranscriptionEngine | None = None
default_model_id: str = 'base'


@asynccontextmanager
async def lifespan(app: FastAPI):
    global hardware, engine, default_model_id

    logger.info('Detecting hardware...')
    hardware = detect_hardware()
    logger.info(f'Hardware: {hardware.device_type} ({hardware.device_name}, {hardware.memory_gb}GB)')
    logger.info(f'Engine: {hardware.engine}')

    engine = create_engine(hardware)
    default_model_id = get_default_model(hardware.device_type != 'cpu')
    logger.info(f'Default model: {default_model_id}')

    yield

    logger.info('Shutting down')


app = FastAPI(title='Vibe Transcription Backend', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def _sse_event(event: str, data: dict[str, object]) -> str:
    return f'event: {event}\ndata: {json.dumps(data)}\n\n'


@app.get('/api/info')
async def info():
    return {
        'hardware': hardware.device_type if hardware else 'unknown',
        'device': hardware.device_name if hardware else 'unknown',
        'memory_gb': hardware.memory_gb if hardware else 0,
        'engine': engine.engine_name() if engine else 'none',
        'default_model': default_model_id,
        'available_models': list_models(),
    }


def _run_transcription(
    eng: TranscriptionEngine,
    audio_path: str,
    model_id: str,
    use_vad: bool,
    q: queue.Queue[str | None],
) -> None:
    """Run transcription in a thread, pushing SSE events into the queue."""
    try:
        def on_progress(event_type: str, data: dict[str, object]) -> None:
            q.put(_sse_event(event_type, data))

        result = eng.transcribe(
            audio_path=audio_path,
            model_id=model_id,
            use_vad=use_vad,
            on_progress=on_progress,
        )
        q.put(_sse_event('result', result.to_dict()))
    except Exception as e:
        logger.exception('Transcription failed')
        q.put(_sse_event('error', {'message': str(e)}))
    finally:
        q.put(_SENTINEL)


@app.post('/api/transcribe')
async def transcribe(
    file: UploadFile = File(...),
    model: str | None = Query(None, description='Model ID from registry'),
    vad: bool = Query(True, description='Enable VAD preprocessing'),
):
    filename = file.filename or ''
    ext = os.path.splitext(filename)[1].lower()
    content_type = file.content_type or ''

    if content_type not in VALID_AUDIO_TYPES and ext not in VALID_EXTENSIONS:
        raise HTTPException(400, detail='Unsupported audio format')

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, detail='File exceeds 100MB limit')

    model_id = model or default_model_id

    try:
        get_model(model_id)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    async def event_stream():
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext or '.wav', delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            assert engine is not None
            q: queue.Queue[str | None] = queue.Queue()

            thread = threading.Thread(
                target=_run_transcription,
                args=(engine, tmp_path, model_id, vad, q),
                daemon=True,
            )
            thread.start()

            loop = asyncio.get_event_loop()
            while True:
                item = await loop.run_in_executor(None, q.get)
                if item is _SENTINEL:
                    break
                assert isinstance(item, str)
                yield item

        except Exception as e:
            logger.exception('Transcription stream failed')
            yield _sse_event('error', {'message': str(e)})

        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(
        event_stream(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )


# Serve frontend static files (vite build output) — must be LAST mount
if DIST_DIR.is_dir():
    @app.get('/{full_path:path}')
    async def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / 'index.html')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=True)
