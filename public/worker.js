/**
 * Web Worker — Whisper ASR transcription engine
 *
 * Inbound:  { type: 'transcribe', audio: Float32Array, model: string, dtype: string }
 * Outbound: { type: 'progress', status: string }
 *           { type: 'model-info', model: string, dtype: string }
 *           { type: 'download-progress', file: string, progress: number, loaded: number, total: number }
 *           { type: 'transcription-progress', completedChunks: number, totalChunks: number }
 *           { type: 'result',   data: { text, chunks } }
 *           { type: 'error',    message: string }
 */

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

let transcriber = null;
let cachedModelId = null;
let cachedDtype = null;

async function getPipeline(modelId, dtype) {
  if (transcriber && cachedModelId === modelId && cachedDtype === dtype) {
    return transcriber;
  }

  // Dispose previous pipeline if model/dtype changed
  if (transcriber) {
    try { await transcriber.dispose(); } catch { /* ignore */ }
    transcriber = null;
  }

  cachedModelId = modelId;
  cachedDtype = dtype;

  postMessage({ type: 'model-info', model: modelId, dtype });
  postMessage({ type: 'progress', status: 'Loading model…' });

  transcriber = await pipeline(
    'automatic-speech-recognition',
    modelId,
    {
      dtype,
      device: 'wasm',
      progress_callback: (event) => {
        if (event.status === 'progress' && event.file) {
          postMessage({
            type: 'download-progress',
            file: event.file,
            progress: Math.round(event.progress ?? 0),
            loaded: event.loaded ?? 0,
            total: event.total ?? 0,
          });
        }
      },
    },
  );

  postMessage({ type: 'progress', status: 'Model loaded.' });
  return transcriber;
}

/**
 * Calculate total audio chunks using the same formula as the ASR pipeline.
 * Mirrors: window = SR * chunk_length_s, stride = SR * stride_length_s, jump = window - 2*stride
 */
function countAudioChunks(audioLength) {
  const SR = 16000;
  const window = SR * CHUNK_LENGTH_S;
  const stride = SR * STRIDE_LENGTH_S;
  const jump = window - 2 * stride;

  if (audioLength <= window) return 1;

  let chunks = 0;
  let offset = 0;
  while (offset + window <= audioLength) {
    chunks++;
    offset += jump;
  }
  // Remaining partial chunk
  if (offset < audioLength) chunks++;
  return chunks;
}

async function transcribe(audio, modelId, dtype) {
  const pipe = await getPipeline(modelId, dtype);

  const totalChunks = countAudioChunks(audio.length);
  let completedChunks = 0;

  postMessage({ type: 'progress', status: 'Transcribing…' });
  postMessage({ type: 'transcription-progress', completedChunks: 0, totalChunks });

  // Duck-typed streamer: put() = token heartbeat, end() = chunk completed
  const streamer = {
    put() { /* token generated — could add heartbeat here if needed */ },
    end() {
      completedChunks++;
      postMessage({ type: 'transcription-progress', completedChunks, totalChunks });
    },
  };

  const result = await pipe(audio, {
    return_timestamps: 'word',
    chunk_length_s: CHUNK_LENGTH_S,
    stride_length_s: STRIDE_LENGTH_S,
    streamer,
  });

  return {
    text: result.text,
    chunks: result.chunks,
  };
}

self.addEventListener('message', async (e) => {
  const { type, audio, model, dtype } = e.data;
  if (type !== 'transcribe') return;

  try {
    if (!audio || audio.length === 0) {
      postMessage({ type: 'error', message: 'Empty audio data received.' });
      return;
    }

    if (!model || !dtype) {
      postMessage({ type: 'error', message: 'Model and dtype are required.' });
      return;
    }

    const data = await transcribe(audio, model, dtype);
    postMessage({ type: 'result', data });
  } catch (err) {
    postMessage({
      type: 'error',
      message: `Failed to transcribe audio: ${err.message ?? err}`,
    });
  }
});
