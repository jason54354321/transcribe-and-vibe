/**
 * Web Worker — Whisper ASR transcription engine
 *
 * Inbound:  { type: 'transcribe', audio: Float32Array }
 * Outbound: { type: 'progress', status: string }
 *           { type: 'model-info', model: string, dtype: string }
 *           { type: 'download-progress', file: string, progress: number, loaded: number, total: number }
 *           { type: 'result',   data: { text, chunks } }
 *           { type: 'error',    message: string }
 */

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

const MODEL_ID = 'onnx-community/whisper-small_timestamped';
const DTYPE = 'q8';
const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

let transcriber = null;

async function getPipeline() {
  if (transcriber) return transcriber;

  postMessage({ type: 'model-info', model: MODEL_ID, dtype: DTYPE });
  postMessage({ type: 'progress', status: 'Loading model…' });

  transcriber = await pipeline(
    'automatic-speech-recognition',
    MODEL_ID,
    {
      dtype: DTYPE,
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

async function transcribe(audio) {
  const pipe = await getPipeline();

  postMessage({ type: 'progress', status: 'Transcribing…' });

  const result = await pipe(audio, {
    return_timestamps: 'word',
    chunk_length_s: CHUNK_LENGTH_S,
    stride_length_s: STRIDE_LENGTH_S,
  });

  return {
    text: result.text,
    chunks: result.chunks,
  };
}

self.addEventListener('message', async (e) => {
  const { type, audio } = e.data;
  if (type !== 'transcribe') return;

  try {
    if (!audio || audio.length === 0) {
      postMessage({ type: 'error', message: 'Empty audio data received.' });
      return;
    }

    const data = await transcribe(audio);
    postMessage({ type: 'result', data });
  } catch (err) {
    postMessage({
      type: 'error',
      message: `Failed to transcribe audio: ${err.message ?? err}`,
    });
  }
});
