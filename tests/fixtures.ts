import { expect, type Page } from '@playwright/test'

const TEST_AUDIO_PATH = 'tests/fixtures/test_vibe.m4a'

export const MOCK_MODEL_ID = 'base'
export const MOCK_DTYPE = 'int8'
export const MOCK_ENGINE = 'faster-whisper'
export const MOCK_EXECUTION_BACKEND = 'cpu'

export const MOCK_BACKEND_INFO = {
  hardware: 'cpu',
  device: 'Test CPU',
  memory_gb: 0,
  engine: MOCK_ENGINE,
  execution_backend: MOCK_EXECUTION_BACKEND,
  acceleration: 'cpu',
  default_model: MOCK_MODEL_ID,
  available_models: [
    { id: 'base', label: 'Base', description: 'Fastest CPU fallback', vram_mb: 200 },
    { id: 'small', label: 'Small', description: 'Higher accuracy CPU option', vram_mb: 500 },
  ],
} as const

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

export type MockBackendOptions = {
  delay?: number
  error?: string
  chunks?: Array<{ text: string; timestamp: [number | null, number | null] }>
  text?: string
  totalChunks?: number
  backendInfo?: Partial<typeof MOCK_BACKEND_INFO>
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
    window.HTMLMediaElement.prototype.play = function() {
      return Promise.resolve();
    };
  }
`

function getMockBackendScript(options?: MockBackendOptions) {
  const delay = options?.delay ?? 0
  const error = options?.error ?? null
  const chunks = options?.chunks ?? MOCK_CHUNKS
  const text = options?.text ?? MOCK_TEXT
  const totalChunks = options?.totalChunks ?? 0
  const backendInfo = {
    ...MOCK_BACKEND_INFO,
    ...options?.backendInfo,
    available_models: options?.backendInfo?.available_models ?? MOCK_BACKEND_INFO.available_models,
  }

  return `
    const BACKEND_INFO = ${JSON.stringify(backendInfo)};
    const MOCK_TEXT = ${JSON.stringify(text)};
    const MOCK_CHUNKS = ${JSON.stringify(chunks)};
    const DEFAULT_MODEL_ID = ${JSON.stringify(MOCK_MODEL_ID)};
    const DEFAULT_DTYPE = ${JSON.stringify(MOCK_DTYPE)};
    const DEFAULT_ENGINE = ${JSON.stringify(MOCK_ENGINE)};
    const DEFAULT_EXECUTION_BACKEND = ${JSON.stringify(MOCK_EXECUTION_BACKEND)};
    const MOCK_DELAY = ${JSON.stringify(delay)};
    const MOCK_ERROR = ${JSON.stringify(error)};
    const TOTAL_CHUNKS = ${JSON.stringify(totalChunks)};

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function toSseEvent(event, data) {
      return 'event: ' + event + '\\ndata: ' + JSON.stringify(data) + '\\n\\n';
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const urlValue = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(urlValue, window.location.origin);

      if (url.pathname.endsWith('/api/info')) {
        return new Response(JSON.stringify(BACKEND_INFO), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.endsWith('/api/transcribe')) {
        const model = url.searchParams.get('model') || BACKEND_INFO.default_model || DEFAULT_MODEL_ID;
        const encoder = new TextEncoder();

        return new Response(
          new ReadableStream({
            async start(controller) {
              controller.enqueue(encoder.encode(toSseEvent('model-loading', {
                status: 'Loading model ' + model + '...',
              })));
              controller.enqueue(encoder.encode(toSseEvent('model-info', {
                hardware: BACKEND_INFO.hardware,
                model,
                dtype: DEFAULT_DTYPE,
                engine: BACKEND_INFO.engine || DEFAULT_ENGINE,
                execution_backend: BACKEND_INFO.execution_backend || DEFAULT_EXECUTION_BACKEND,
              })));

              if (TOTAL_CHUNKS > 0) {
                controller.enqueue(encoder.encode(toSseEvent('transcription-progress', {
                  completed_chunks: 0,
                  total_chunks: TOTAL_CHUNKS,
                })));

                for (let i = 1; i <= TOTAL_CHUNKS; i++) {
                  await sleep(Math.max(Math.floor(MOCK_DELAY / TOTAL_CHUNKS), 1));
                  controller.enqueue(encoder.encode(toSseEvent('transcribing', {
                    status: 'Transcribing... ' + Math.round((i / TOTAL_CHUNKS) * 100) + '%',
                    progress: Math.round((i / TOTAL_CHUNKS) * 100),
                  })));
                  controller.enqueue(encoder.encode(toSseEvent('transcription-progress', {
                    completed_chunks: i,
                    total_chunks: TOTAL_CHUNKS,
                  })));
                }
              } else if (MOCK_DELAY > 0) {
                controller.enqueue(encoder.encode(toSseEvent('transcribing', {
                  status: 'Transcribing...',
                  progress: 10,
                })));
                await sleep(MOCK_DELAY);
              } else {
                controller.enqueue(encoder.encode(toSseEvent('transcribing', {
                  status: 'Transcribing...',
                  progress: 50,
                })));
              }

              if (MOCK_ERROR) {
                controller.enqueue(encoder.encode(toSseEvent('error', { message: MOCK_ERROR })));
                controller.close();
                return;
              }

              controller.enqueue(encoder.encode(toSseEvent('result', {
                text: MOCK_TEXT,
                chunks: MOCK_CHUNKS,
                hardware: BACKEND_INFO.hardware,
                model,
                dtype: DEFAULT_DTYPE,
                engine: BACKEND_INFO.engine || DEFAULT_ENGINE,
                execution_backend: BACKEND_INFO.execution_backend || DEFAULT_EXECUTION_BACKEND,
              })));
              controller.close();
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        );
      }

      return originalFetch(input, init);
    };
  `
}

export async function setupMockBackend(page: Page, options?: MockBackendOptions) {
  await page.addInitScript(BROWSER_MOCKS_SCRIPT)
  await page.addInitScript(getMockBackendScript(options))
}

export async function setupUnavailableBackend(page: Page) {
  await page.addInitScript(BROWSER_MOCKS_SCRIPT)
  await page.addInitScript(`
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      const urlValue = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(urlValue, window.location.origin);
      if (url.pathname.endsWith('/api/info')) {
        throw new Error('Backend unavailable');
      }
      if (url.pathname.endsWith('/api/transcribe')) {
        return new Response('Backend unavailable', { status: 503 });
      }
      return originalFetch(input, init);
    };
  `)
}

export async function uploadTestAudio(page: Page) {
  const fileInput = page.locator('#file-input')
  await fileInput.setInputFiles(TEST_AUDIO_PATH)
}

export async function transcribeAndWaitForSession(page: Page) {
  await uploadTestAudio(page)
  await expect(page.locator('#transcript-container')).toBeVisible()
  await expect(page.locator('.session-item')).toHaveCount(1)
}
