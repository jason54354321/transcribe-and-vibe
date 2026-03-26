/**
 * Web Worker — Whisper ASR transcription engine
 *
 * Inbound:  { type: 'transcribe', audio: Float32Array }
 * Outbound: { type: 'progress', status: string }
 *           { type: 'result',   data: { text, chunks, language } }
 *           { type: 'error',    message: string }
 */

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

let transcriber = null;

async function getPipeline() {
  if (transcriber) return transcriber;

  postMessage({ type: 'progress', status: 'Loading model… (first time downloads ~150 MB)' });

  transcriber = await pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-base_timestamped',
    {
      dtype: 'q8',              // quantised — smaller + faster on CPU
      device: 'wasm',           // explicit WASM; auto would try WebGPU first
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
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  return {
    text: result.text,
    chunks: result.chunks,                       // [{ text, timestamp: [start, end] }]
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
