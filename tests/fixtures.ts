import type { Page } from '@playwright/test';
// @ts-ignore Runtime module is available in Playwright.
import path from 'path';

declare const __dirname: string;

export const MOCK_MODEL_ID = 'onnx-community/whisper-small_timestamped';
export const MOCK_DTYPE = 'fp16';

export const MOCK_CHUNKS = [
  { text: ' Hello', timestamp: [0.0, 0.42] },
  { text: ' world', timestamp: [0.42, 0.78] },
  { text: ' this', timestamp: [0.78, 1.02] },
  { text: ' is', timestamp: [1.02, 1.18] },
  { text: ' a', timestamp: [1.18, 1.3] },
  { text: ' test', timestamp: [2.5, 2.82] },
  { text: ' of', timestamp: [2.82, 3.0] },
  { text: ' transcription', timestamp: [3.0, 3.62] },
] as const;

export const MOCK_TEXT = ' Hello world this is a test of transcription';

export type MockWorkerOptions = {
  delay?: number;
  error?: string;
  downloadDelay?: number;
};

export function getMockWorkerScript(options?: MockWorkerOptions) {
  const delay = options?.delay ?? 0;
  const error = options?.error;
  const downloadDelay = options?.downloadDelay ?? 0;

  return `
const MOCK_TEXT = ${JSON.stringify(MOCK_TEXT)};
const MOCK_CHUNKS = ${JSON.stringify(MOCK_CHUNKS)};
const MODEL_ID = ${JSON.stringify(MOCK_MODEL_ID)};
const DTYPE = ${JSON.stringify(MOCK_DTYPE)};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

self.addEventListener('message', async (event) => {
  const { type } = event.data ?? {};
  if (type !== 'transcribe') return;

  self.postMessage({ type: 'model-info', model: MODEL_ID, dtype: DTYPE });
  self.postMessage({ type: 'progress', status: 'Loading model…' });

  if (${JSON.stringify(downloadDelay)} > 0) {
    self.postMessage({ type: 'download-progress', file: 'onnx/encoder_model_fp16.onnx', progress: 50, loaded: 92274688, total: 184549376 });
    await sleep(${JSON.stringify(downloadDelay)} / 2);
    self.postMessage({ type: 'download-progress', file: 'onnx/encoder_model_fp16.onnx', progress: 100, loaded: 184549376, total: 184549376 });
    await sleep(${JSON.stringify(downloadDelay)} / 2);
  }

  if (${JSON.stringify(delay)} > 0) {
    await sleep(${JSON.stringify(delay)});
  }

  if (${JSON.stringify(Boolean(error))}) {
    self.postMessage({ type: 'error', message: ${JSON.stringify(error ?? '')} });
    return;
  }

  self.postMessage({ type: 'progress', status: 'Transcribing…' });

  self.postMessage({
    type: 'result',
    data: {
      text: MOCK_TEXT,
      chunks: MOCK_CHUNKS,
    },
  });
});
`;
}

export async function setupMockWorker(page: Page, options?: MockWorkerOptions) {
  const script = getMockWorkerScript(options);

  await page.addInitScript(`
    class MockAudioContext {
      constructor(options) {
        this.sampleRate = (options && options.sampleRate) || 16000;
      }
      async decodeAudioData() {
        return {
          getChannelData() {
            return new Float32Array(1600);
          },
        };
      }
      close() {
        return Promise.resolve();
      }
    }
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
    if (window.HTMLMediaElement) {
      window.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
    }
  `);

  await page.route('**/*silero*.onnx', (route) => route.abort());
  await page.route('**/ort-wasm*.wasm', (route) => route.abort());
  await page.route('**/ort-wasm*.mjs', (route) => route.abort());

  await page.route('**/worker.js', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: script }),
  );
}

export async function uploadTestAudio(page: Page) {
  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test_vibe.m4a'));
}
