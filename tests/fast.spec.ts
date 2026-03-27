import { test, expect } from '@playwright/test';

import { MOCK_CHUNKS, MOCK_MODEL_ID, MOCK_DTYPE, setupMockWorker, uploadTestAudio } from './fixtures';

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

    test('paragraph grouping', async ({ page }) => {
      await uploadTestAudio(page);

      const paragraphs = page.locator('#transcript-content > p');
      await expect(paragraphs).toHaveCount(2);
      await expect(paragraphs.nth(0).locator('.word')).toHaveCount(5);
      await expect(paragraphs.nth(1).locator('.word')).toHaveCount(3);
    });

    test('click-to-seek', async ({ page }) => {
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
      await expect(dlProgress).toContainText('encoder_model_fp16.onnx');
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
  });
});
