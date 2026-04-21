import { expect, type Page } from '@playwright/test'
// @ts-ignore Runtime module is available in Playwright.
import path from 'path'

declare const __dirname: string

export const MOCK_MODEL_ID = 'onnx-community/whisper-small_timestamped'
export const MOCK_DTYPE = 'q8'

export const MOCK_CHUNKS = [
  { text: ' Hello', timestamp: [0.0, 0.42] },
  { text: ' world', timestamp: [0.42, 0.78] },
  { text: ' this', timestamp: [0.78, 1.02] },
  { text: ' is', timestamp: [1.02, 1.18] },
  { text: ' a', timestamp: [1.18, 1.3] },
  { text: ' test', timestamp: [2.5, 2.82] },
  { text: ' of', timestamp: [2.82, 3.0] },
  { text: ' transcription', timestamp: [3.0, 3.62] },
] as const

export const MOCK_TEXT = ' Hello world this is a test of transcription'

export type MockWorkerOptions = {
  delay?: number
  error?: string
  downloadDelay?: number
  chunks?: Array<{ text: string; timestamp: [number | null, number | null] }>
  text?: string
  totalChunks?: number
}

export function getMockWorkerScript(options?: MockWorkerOptions) {
  const delay = options?.delay ?? 0
  const error = options?.error
  const downloadDelay = options?.downloadDelay ?? 0
  const chunks = options?.chunks ?? MOCK_CHUNKS
  const text = options?.text ?? MOCK_TEXT
  const segments = options?.totalChunks ?? 0

  return `
const MOCK_TEXT = ${JSON.stringify(text)};
const MOCK_CHUNKS = ${JSON.stringify(chunks)};
const MODEL_ID = ${JSON.stringify(MOCK_MODEL_ID)};
const DTYPE = ${JSON.stringify(MOCK_DTYPE)};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

self.addEventListener('message', async (event) => {
  const { type, model, dtype } = event.data ?? {};
  if (type !== 'transcribe') return;

  const usedModel = model || MODEL_ID;
  const usedDtype = dtype || DTYPE;
  self.postMessage({ type: 'model-info', model: usedModel, dtype: usedDtype });
  self.postMessage({ type: 'progress', status: 'Loading model…' });

  if (${JSON.stringify(downloadDelay)} > 0) {
    self.postMessage({ type: 'download-progress', file: 'onnx/encoder_model_quantized.onnx', progress: 50, loaded: 92274688, total: 184549376 });
    await sleep(${JSON.stringify(downloadDelay)} / 2);
    self.postMessage({ type: 'download-progress', file: 'onnx/encoder_model_quantized.onnx', progress: 100, loaded: 184549376, total: 184549376 });
    await sleep(${JSON.stringify(downloadDelay)} / 2);
  }

  if (${JSON.stringify(segments)} === 0 && ${JSON.stringify(delay)} > 0) {
    await sleep(${JSON.stringify(delay)});
  }

  if (${JSON.stringify(Boolean(error))}) {
    self.postMessage({ type: 'error', message: ${JSON.stringify(error ?? '')} });
    return;
  }

  const TOTAL_CHUNKS = ${JSON.stringify(segments)};
  self.postMessage({ type: 'progress', status: 'Transcribing…' });
  if (TOTAL_CHUNKS > 0) {
    self.postMessage({ type: 'transcription-progress', completedChunks: 0, totalChunks: TOTAL_CHUNKS });
    for (let i = 1; i <= TOTAL_CHUNKS; i++) {
      await sleep(${JSON.stringify(delay)} / TOTAL_CHUNKS);
      self.postMessage({ type: 'transcription-progress', completedChunks: i, totalChunks: TOTAL_CHUNKS });
    }
  } else if (${JSON.stringify(delay)} > 0) {
    await sleep(${JSON.stringify(delay)});
  }

  self.postMessage({
    type: 'result',
    data: {
      text: MOCK_TEXT,
      chunks: MOCK_CHUNKS,
    },
  });
});
`
}

const BROWSER_MOCKS_SCRIPT = `
    class MockAudioContext {
      constructor(options) {
        this.sampleRate = (options && options.sampleRate) || 16000;
      }
      async decodeAudioData() {
        return {
          duration: 0.1,
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
`

export async function setupMockWorker(page: Page, options?: MockWorkerOptions) {
  const script = getMockWorkerScript(options)

  await page.addInitScript(BROWSER_MOCKS_SCRIPT)

  await page.route('**/*silero*.onnx', (route) => route.abort())
  await page.route('**/ort-wasm*.wasm', (route) => route.abort())
  await page.route('**/ort-wasm*.mjs', (route) => route.abort())
  await page.route('**/api/info', (route) => route.abort())

  await page.route(/\/worker\b/, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: script }),
  )
}

export async function setupBrokenWorker(page: Page) {
  await page.addInitScript(BROWSER_MOCKS_SCRIPT)
  await page.route('**/api/info', (route) => route.abort())

  await page.route(/\/worker\b/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'throw new Error("CDN failed to load");',
    }),
  )
}

export async function uploadTestAudio(page: Page) {
  const fileInput = page.locator('#file-input')
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test_vibe.m4a'))
}

export async function transcribeAndWaitForSession(page: Page) {
  await uploadTestAudio(page)
  await expect(page.locator('#transcript-container')).toBeVisible()
  await expect(page.locator('.session-item')).toHaveCount(1)
}

export async function setupMockWorkerWithBackendAvailable(page: Page) {
  await setupMockWorker(page)
  await page.route('**/api/info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        hardware: 'apple_silicon',
        device: 'Apple M4',
        memory_gb: 16,
        engine: 'mlx-whisper',
        default_model: 'large-v3-turbo',
        available_models: [
          { id: 'large-v3-turbo', label: 'Large V3 Turbo', description: '', vram_mb: 1500 },
          { id: 'small', label: 'Small', description: '', vram_mb: 500 },
        ],
      }),
    }),
  )
}
