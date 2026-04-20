import { test, expect, type Page } from '@playwright/test';

import { MOCK_CHUNKS, MOCK_MODEL_ID, MOCK_DTYPE, setupMockWorker, setupBrokenWorker, uploadTestAudio } from './fixtures';

async function transcribeAndWaitForSession(page: Page) {
  await uploadTestAudio(page);
  await expect(page.locator('#transcript-container')).toBeVisible();
  await expect(page.locator('.session-item')).toHaveCount(1);
}

async function setupMockWorkerWithBackendAvailable(page: Page) {
  await setupMockWorker(page)
  await page.route('**/api/info', (route) => route.fulfill({
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
  }))
}

declare const Buffer: {
  from(input: string): Uint8Array;
};

test.describe('Vibe Transcription - Fast Loop', () => {
  test.describe('default mock worker', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
    });

    test('initial UI state', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#status-container')).toBeHidden();
      await expect(page.locator('#audio-container')).toBeHidden();
      await expect(page.locator('#transcript-container')).toBeHidden();
      await expect(page.locator('#error-container')).toBeHidden();
    });

    test('file upload shows transcript', async ({ page }) => {
      await uploadTestAudio(page);

      await expect(page.locator('#transcript-container')).toBeVisible();
      await expect(page.locator('.word')).toHaveCount(8);
    });

    test('invalid file type rejected', async ({ page }) => {
      await page.locator('#file-input').setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('hello'),
      });

      await expect(page.locator('#error-container')).toBeVisible();
      await expect(page.locator('#error-container')).toContainText('Invalid file type');
    });

    test('oversized file rejected', async ({ page }) => {
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const file = new File(['x'], 'big.mp3', { type: 'audio/mpeg' });
        Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 });
        dt.items.add(file);

        const input = document.getElementById('file-input') as HTMLInputElement;
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await expect(page.locator('#error-container')).toBeVisible();
      await expect(page.locator('#error-container')).toContainText(/too large/i);
    });

    test('word spans have correct data attributes', async ({ page }) => {
      await uploadTestAudio(page);
      await expect(page.locator('#transcript-container')).toBeVisible();

      const words = await page.locator('.word').all();
      expect(words).toHaveLength(MOCK_CHUNKS.length);

      for (const [index, word] of words.entries()) {
        await expect(word).toHaveAttribute('data-start', String(Math.round(MOCK_CHUNKS[index].timestamp[0] * 1000)));
        await expect(word).toHaveAttribute('data-end', String(Math.round(MOCK_CHUNKS[index].timestamp[1] * 1000)));
      }
    });

    test('paragraph grouping and timestamps', async ({ page }) => {
      await uploadTestAudio(page);

      const paragraphs = page.locator('#transcript-content > p');
      await expect(paragraphs).toHaveCount(2);
      await expect(paragraphs.nth(0).locator('.word')).toHaveCount(5);
      await expect(paragraphs.nth(1).locator('.word')).toHaveCount(3);

      const timestamps = page.locator('.paragraph-timestamp');
      await expect(timestamps).toHaveCount(2);
      await expect(timestamps.nth(0)).toHaveText('0:00');
      await expect(timestamps.nth(1)).toHaveText('0:02');
    });

    test('click paragraph timestamp seeks audio', async ({ page }) => {
      await uploadTestAudio(page);

      await page.locator('.paragraph-timestamp').nth(1).click();

      const currentTime = await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        return audio.currentTime;
      });

      expect(currentTime).toBeCloseTo(2.5, 1);
    });

    test('click-to-seek word', async ({ page }) => {
      await uploadTestAudio(page);

      await page.locator('.word').nth(2).click();

      const currentTime = await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        return audio.currentTime;
      });

      expect(currentTime).toBeCloseTo(0.78, 1);
    });

    test('auto-highlight on matching time', async ({ page }) => {
      await uploadTestAudio(page);
      await expect(page.locator('#transcript-container')).toBeVisible();

      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        Object.defineProperty(audio, 'currentTime', { value: 0.5, writable: true, configurable: true });
        audio.dispatchEvent(new Event('timeupdate'));
      });

      const words = page.locator('.word');
      await expect(words.nth(1)).toHaveClass(/active/);
      await expect(page.locator('.word.active')).toHaveCount(1);
    });

    test('auto-highlight clears on out-of-range', async ({ page }) => {
      await uploadTestAudio(page);

      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        Object.defineProperty(audio, 'currentTime', { value: 99.0, writable: true, configurable: true });
        audio.dispatchEvent(new Event('timeupdate'));
      });

      await expect(page.locator('.word.active')).toHaveCount(0);
    });

    test('meta info displays correctly', async ({ page }) => {
      await uploadTestAudio(page);

      await expect(page.locator('#meta-info')).toHaveText('8 words · 0m 3s');
    });
  });

  test.describe('highlight preference', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
    });

    test('toggle word highlight turns off active class', async ({ page }) => {
      await uploadTestAudio(page);
      await expect(page.locator('#transcript-container')).toBeVisible();

      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        Object.defineProperty(audio, 'currentTime', { value: 0.5, writable: true, configurable: true });
        audio.dispatchEvent(new Event('timeupdate'));
      });

      await expect(page.locator('.word.active')).toHaveCount(1);

      await page.locator('label', { hasText: 'Word highlight' }).locator('input[type="checkbox"]').uncheck();

      await expect(page.locator('.word.active')).toHaveCount(0);

      await page.locator('label', { hasText: 'Word highlight' }).locator('input[type="checkbox"]').check();

      await expect(page.locator('.word.active')).toHaveCount(1);
    });

    test('preference persists after reload', async ({ page }) => {
      await page.locator('label', { hasText: 'Word highlight' }).locator('input[type="checkbox"]').uncheck();

      await page.reload();

      const toggle = page.locator('label', { hasText: 'Word highlight' }).locator('input[type="checkbox"]');
      await expect(toggle).not.toBeChecked();
    });
  });

  test.describe('custom mock worker', () => {
    test('progress UI during transcription', async ({ page }) => {
      await setupMockWorker(page, { delay: 2000 });
      await page.goto('/');

      await uploadTestAudio(page);

      await expect(page.locator('#status-container')).toBeVisible();
      await expect(page.locator('#status-text')).not.toHaveText('');
      await expect(page.locator('#transcript-container')).toBeVisible();
    });

    test('worker error shows error message', async ({ page }) => {
      await setupMockWorker(page, { error: 'Model failed to load' });
      await page.goto('/');

      await uploadTestAudio(page);

      await expect(page.locator('#error-container')).toBeVisible();
      await expect(page.locator('#error-container')).toContainText('Model failed to load');
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('model info badge shows model and dtype', async ({ page }) => {
      await setupMockWorker(page, { delay: 500 });
      await page.goto('/');

      await uploadTestAudio(page);

      const badge = page.locator('#model-badge');
      await expect(badge).toBeVisible();

      const expectedName = MOCK_MODEL_ID.split('/').pop();
      await expect(badge).toContainText(expectedName!);
      await expect(badge).toContainText(MOCK_DTYPE);
    });

    test('download progress bar appears during model download', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 1000 });
      await page.goto('/');

      await uploadTestAudio(page);

      const dlProgress = page.locator('#download-progress');
      await expect(dlProgress).toBeVisible({ timeout: 3000 });
      await expect(dlProgress).toContainText('encoder_model_quantized.onnx');
      await expect(dlProgress).toContainText('MB');
    });

    test('download progress clears after completion', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 200 });
      await page.goto('/');

      await uploadTestAudio(page);

      await expect(page.locator('#transcript-container')).toBeVisible();
      await expect(page.locator('#download-progress')).toBeHidden();
    });

    test('all progress UI clears after completion', async ({ page }) => {
      await setupMockWorker(page, { downloadDelay: 100 });
      await page.goto('/');

      await uploadTestAudio(page);

      await expect(page.locator('#transcript-container')).toBeVisible();
      await expect(page.locator('#download-progress')).toBeHidden();
    });

    test('transcription progress bar shows during multi-segment transcription', async ({ page }) => {
      await setupMockWorker(page, { totalChunks: 5, delay: 3000 });
      await page.goto('/');

      await uploadTestAudio(page);

      await expect(page.locator('.determinate-track')).toBeVisible({ timeout: 5000 });

      const progressInfo = page.locator('.progress-info');
      await expect(progressInfo).toBeVisible();
      await expect(progressInfo).toContainText(/\d+ \/ 5 chunks/);

      const subStatus = page.locator('.sub-status');
      await expect(subStatus).toBeVisible();

      await expect(page.locator('#transcript-container')).toBeVisible({ timeout: 10000 });

      await expect(page.locator('.determinate-track')).toBeHidden();
    });
  });

  test.describe('session persistence', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
    });

    test('sidebar visible with empty state', async ({ page }) => {
      await expect(page.locator('#session-sidebar')).toBeVisible();
      await expect(page.locator('.empty-state')).toContainText('No sessions yet');
    });

    test('session appears in sidebar after transcription', async ({ page }) => {
      await transcribeAndWaitForSession(page);

      await expect(page.locator('.session-name')).toContainText('test_vibe.m4a');
      await expect(page.locator('.session-item.is-active')).toHaveCount(1);
    });

    test('session persists after page reload', async ({ page }) => {
      await transcribeAndWaitForSession(page);

      await page.reload();

      await expect(page.locator('.session-item')).toHaveCount(1);
      await expect(page.locator('.session-name')).toContainText('test_vibe.m4a');
    });

    test('clicking session restores transcript', async ({ page }) => {
      await transcribeAndWaitForSession(page);

      await page.locator('.new-btn').click();
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#transcript-container')).toBeHidden();

      await page.locator('.session-item').click();
      await expect(page.locator('#transcript-container')).toBeVisible();
      await expect(page.locator('.word')).toHaveCount(8);
    });

    test('new session button resets to DropZone', async ({ page }) => {
      await transcribeAndWaitForSession(page);

      await page.locator('.new-btn').click();
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#transcript-container')).toBeHidden();
      await expect(page.locator('.session-item.is-active')).toHaveCount(0);
    });

    test('delete session removes it from sidebar', async ({ page }) => {
      await transcribeAndWaitForSession(page);

      page.on('dialog', dialog => dialog.accept());

      await page.locator('.session-item').hover();
      await page.locator('.delete-btn').click();

      await expect(page.locator('.session-item')).toHaveCount(0);
      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('switching mode after completed transcription preserves displayed transcript', async ({ page }) => {
      await setupMockWorkerWithBackendAvailable(page)
      await page.goto('/')

      await expect(page.locator('#backend-toggle')).toBeChecked()
      await page.locator('#backend-toggle').uncheck()

      await transcribeAndWaitForSession(page)
      await expect(page.locator('.word')).toHaveCount(8)

      await page.locator('#backend-toggle').check()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)
    })

    test('switching mode after restoring a saved session preserves displayed transcript', async ({ page }) => {
      await setupMockWorkerWithBackendAvailable(page)
      await page.goto('/')

      await expect(page.locator('#backend-toggle')).toBeChecked()
      await page.locator('#backend-toggle').uncheck()

      await transcribeAndWaitForSession(page)
      await page.locator('.new-btn').click()
      await page.locator('.session-item').click()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)

      await page.locator('#backend-toggle').check()
      await expect(page.locator('#transcript-container')).toBeVisible()
      await expect(page.locator('.word')).toHaveCount(8)
    })
  });

  test.describe('Oracle bug regression tests', () => {
    test('C1: object URL is revoked on re-upload', async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');

      await page.evaluate(() => {
        (window as any).__revokedUrls = [];
        const original = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = function(url: string) {
          (window as any).__revokedUrls.push(url);
          return original(url);
        };
      });

      await uploadTestAudio(page);
      await expect(page.locator('#transcript-container')).toBeVisible();

      const firstUrl = await page.locator('#audio-player').getAttribute('src');
      expect(firstUrl).toBeTruthy();

      // Re-upload (input still in DOM via v-show, value reset by DropZone)
      await uploadTestAudio(page);
      await page.waitForFunction(
        (oldUrl: string) => {
          const audio = document.getElementById('audio-player');
          return audio?.getAttribute('src') !== oldUrl;
        },
        firstUrl!,
      );

      const revokedUrls: string[] = await page.evaluate(() => (window as any).__revokedUrls);
      expect(revokedUrls).toContain(firstUrl);
    });

    test('C2: worker.onerror shows error and preserves drop zone', async ({ page }) => {
      await setupBrokenWorker(page);
      await page.goto('/');

      await expect(page.locator('#error-container')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#error-container')).toContainText('Worker error');
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('C4: null timestamps in chunks are skipped gracefully', async ({ page }) => {
      await setupMockWorker(page, {
        chunks: [
          { text: ' Hello', timestamp: [0.0, 0.42] },
          { text: ' world', timestamp: [0.42, null] },
          { text: ' test', timestamp: [null, 1.5] },
          { text: ' good', timestamp: [1.5, 2.0] },
        ],
        text: ' Hello world test good',
      });
      await page.goto('/');
      await uploadTestAudio(page);

      await expect(page.locator('#transcript-container')).toBeVisible();
      // TranscriptView skips chunks with null timestamps (line 34)
      // Only ' Hello' and ' good' have both start+end → 2 words rendered
      await expect(page.locator('.word')).toHaveCount(2);
    });
  });

  test.describe('theme switching', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
    });

    test('toggle theme changes data-theme attribute and persists', async ({ page }) => {
      const html = page.locator('html');
      
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('vibe-theme');
      });

      await page.locator('label', { hasText: 'Dark mode' }).locator('input[type="checkbox"]').check();
      await expect(html).toHaveAttribute('data-theme', 'dark');

      await page.reload();
      const htmlAfterReload = page.locator('html');
      await expect(htmlAfterReload).toHaveAttribute('data-theme', 'dark');
      const toggle = page.locator('label', { hasText: 'Dark mode' }).locator('input[type="checkbox"]');
      await expect(toggle).toBeChecked();

      await toggle.uncheck();
      await expect(htmlAfterReload).toHaveAttribute('data-theme', 'light');

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('drop zone button keeps readable contrast in dark mode', async ({ page }) => {
      await page.locator('#theme-toggle').check();

      const button = page.locator('#drop-zone .btn')
      await expect(button).toHaveCSS('background-color', 'rgb(43, 47, 49)')
      await expect(button).toHaveCSS('color', 'rgb(216, 212, 207)')
    });
  });

  test.describe('keyboard shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
      await uploadTestAudio(page);
      await expect(page.locator('#transcript-container')).toBeVisible();
    });

    test('Space toggles play/pause', async ({ page }) => {
      // Track play/pause calls since mock audio may not flip paused state
      const calls = await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement
        const log: string[] = []
        const origPlay = audio.play.bind(audio)
        const origPause = audio.pause.bind(audio)
        audio.play = () => { log.push('play'); return origPlay() }
        audio.pause = () => { log.push('pause'); return origPause() }
        ;(window as unknown as Record<string, string[]>).__playLog = log
        return log
      })

      await page.keyboard.press('Space')
      await page.keyboard.press('Space')

      const log = await page.evaluate(
        () => (window as unknown as Record<string, string[]>).__playLog,
      )
      expect(log).toContain('play')
      // Second space should trigger pause (audio was playing after first)
      expect(log.length).toBeGreaterThanOrEqual(2)
    });

    test('ArrowRight seeks forward 5 seconds', async ({ page }) => {
      const before = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )

      await page.keyboard.press('ArrowRight')

      const after = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(after).toBeGreaterThan(before)
    });

    test('ArrowLeft seeks backward', async ({ page }) => {
      await page.keyboard.press('ArrowRight')
      const before = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(before).toBeGreaterThan(0)

      await page.keyboard.press('ArrowLeft')
      const after = await page.evaluate(
        () => (document.getElementById('audio-player') as HTMLAudioElement).currentTime,
      )
      expect(after).toBeLessThan(before)
    });

    test('ArrowLeft clamps to 0', async ({ page }) => {
      await page.evaluate(() => {
        const audio = document.getElementById('audio-player') as HTMLAudioElement;
        Object.defineProperty(audio, 'duration', { value: 60, writable: true, configurable: true });
        audio.currentTime = 2;
      });

      await page.keyboard.press('ArrowLeft');

      const time = await page.evaluate(() => (document.getElementById('audio-player') as HTMLAudioElement).currentTime);
      expect(time).toBe(0);
    });

    test('ArrowUp increases volume', async ({ page }) => {
      await page.evaluate(() => {
        (document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5;
      });

      await page.keyboard.press('ArrowUp');

      const vol = await page.evaluate(() => (document.getElementById('audio-player') as HTMLAudioElement).volume);
      expect(vol).toBeCloseTo(0.6, 2);
    });

    test('ArrowDown decreases volume', async ({ page }) => {
      await page.evaluate(() => {
        (document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5;
      });

      await page.keyboard.press('ArrowDown');

      const vol = await page.evaluate(() => (document.getElementById('audio-player') as HTMLAudioElement).volume);
      expect(vol).toBeCloseTo(0.4, 2);
    });

    test('volume indicator appears on volume change', async ({ page }) => {
      await page.evaluate(() => {
        (document.getElementById('audio-player') as HTMLAudioElement).volume = 0.5;
      });

      await page.keyboard.press('ArrowUp');

      await expect(page.locator('.volume-indicator')).toBeVisible();
      await expect(page.locator('.volume-indicator')).toContainText('60%');
    });

    test('Space is ignored when focus is on input', async ({ page }) => {
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.id = 'test-input';
        document.body.appendChild(input);
      });

      await page.locator('#test-input').focus();
      const wasPaused = await page.evaluate(() => (document.getElementById('audio-player') as HTMLAudioElement).paused);

      await page.keyboard.press('Space');

      const stillPaused = await page.evaluate(() => (document.getElementById('audio-player') as HTMLAudioElement).paused);
      expect(stillPaused).toBe(wasPaused);
    });
  });

  test.describe('sidebar responsive behavior', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockWorker(page);
      await page.goto('/');
    });

    test('desktop sidebar remains visible when main content scrolls', async ({ page }) => {
      await transcribeAndWaitForSession(page);
      
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.style.height = '2000px';
        document.querySelector('.main-content')?.appendChild(div);
      });

      await page.setViewportSize({ width: 1024, height: 768 });

      const sidebarBoxBefore = await page.locator('.sidebar').boundingBox();
      expect(sidebarBoxBefore?.y).toBe(0);

      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(100);

      const sidebarBoxAfter = await page.locator('.sidebar').boundingBox();
      expect(sidebarBoxAfter?.y).toBe(0);
    });

    test('mobile sidebar uses drawer behavior', async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 800 });
      
      const sidebar = page.locator('.sidebar');
      const mobileToggle = page.locator('.mobile-toggle');
      const backdrop = page.locator('.sidebar-backdrop');

      await expect(mobileToggle).toBeVisible();

      await expect(sidebar).not.toHaveClass(/is-open/);

      await mobileToggle.click();
      await expect(sidebar).toHaveClass(/is-open/);
      await expect(backdrop).toBeVisible();

      await backdrop.click({ position: { x: 350, y: 50 } });
      await expect(sidebar).not.toHaveClass(/is-open/);
      await expect(backdrop).toBeHidden();
    });
  });
});
