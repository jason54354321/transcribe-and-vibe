import type { Page } from '@playwright/test';
// @ts-ignore Runtime module is available in Playwright.
import path from 'path';

declare const __dirname: string;

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

export function getMockWorkerScript(options?: { delay?: number; error?: string }) {
  const delay = options?.delay ?? 0;
  const error = options?.error;

  return `
const MOCK_TEXT = ${JSON.stringify(MOCK_TEXT)};
const MOCK_CHUNKS = ${JSON.stringify(MOCK_CHUNKS)};

self.addEventListener('message', async (event) => {
  const { type } = event.data ?? {};
  if (type !== 'transcribe') return;

  self.postMessage({ type: 'progress', status: 'Loading model…' });

  if (${JSON.stringify(delay)} > 0) {
    await new Promise((resolve) => setTimeout(resolve, ${JSON.stringify(delay)}));
  }

  if (${JSON.stringify(Boolean(error))}) {
    self.postMessage({ type: 'error', message: ${JSON.stringify(error ?? '')} });
    return;
  }

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

export async function setupMockWorker(page: Page, options?: { delay?: number; error?: string }) {
  const script = getMockWorkerScript(options);

  await page.route(/\/(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const bootstrap = `<script>
class MockAudioContext {
  constructor(options) {
    this.sampleRate = options?.sampleRate ?? 16000;
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
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
}
</script>`;

    await route.fulfill({
      response,
      contentType: 'text/html',
      body: body.replace('<script type="module">', `${bootstrap}<script type="module">`),
    });
  });

  await page.route('**/worker.js', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: script }),
  );
}

export async function uploadTestAudio(page: Page) {
  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test_vibe.m4a'));
}
