/**
 * ASR Benchmark — measures WER across model × VAD matrix.
 *
 * Run:   npm run benchmark
 * Add models:  edit DEFAULT_MODELS in config.ts
 * Add samples: place audio + transcript, edit BENCHMARK_SAMPLES in config.ts
 */
import { test } from '@playwright/test'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { DEFAULT_MODELS, VAD_OPTIONS } from './config'
import type { BenchmarkRunResult } from './config'
import { loadSamples } from './dataset'
import { computeWER } from './wer'

test('ASR benchmark: model × VAD matrix', async ({ page }) => {
  const samples = loadSamples()
  const results: BenchmarkRunResult[] = []

  await page.goto('/')
  await page.waitForSelector('#drop-zone', { state: 'visible' })

  for (const model of DEFAULT_MODELS) {
    await page.locator('#model-select').selectOption(model.id)
    await page.locator('#dtype-select').selectOption(model.dtype)

    for (const useVad of VAD_OPTIONS) {
      for (const sample of samples) {
        console.log(`\n--- ${model.label} (${model.dtype}) | VAD=${useVad} | ${sample.id} ---`)

        const vadCheckbox = page.locator('#vad-toggle')
        const isChecked = await vadCheckbox.isChecked()
        if (isChecked !== useVad) {
          await vadCheckbox.click()
        }

        const start = Date.now()
        await page.locator('#file-input').setInputFiles(sample.audioPath)

        await Promise.race([
          page.locator('#transcript-container').waitFor({ state: 'visible', timeout: 600_000 }),
          page.locator('#error-container').waitFor({ state: 'visible', timeout: 600_000 }),
        ])

        const transcriptVisible = await page.locator('#transcript-container').isVisible()

        if (!transcriptVisible) {
          const errorText = await page.locator('#error-container').textContent()
          console.error(`  ERROR: ${errorText}`)
          await page.locator('.new-btn').click()
          await page.locator('#drop-zone').waitFor({ state: 'visible', timeout: 10_000 })
          continue
        }

        await page.waitForTimeout(500)
        const durationMs = Date.now() - start

        const hypothesis = await page.locator('#transcript-container').textContent() ?? ''
        const wer = computeWER(hypothesis, sample.reference)

        results.push({
          model,
          useVad,
          sample: sample.id,
          hypothesis: hypothesis.trim(),
          reference: sample.reference,
          wer: wer.wer,
          substitutions: wer.substitutions,
          deletions: wer.deletions,
          insertions: wer.insertions,
          durationMs,
        })

        console.log(`  WER: ${(wer.wer * 100).toFixed(2)}%`)
        console.log(`  S=${wer.substitutions} D=${wer.deletions} I=${wer.insertions} (ref=${wer.referenceWords} words)`)
        console.log(`  Time: ${(durationMs / 1000).toFixed(1)}s`)

        await page.locator('.new-btn').click()
        await page.locator('#drop-zone').waitFor({ state: 'visible', timeout: 10_000 })
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('BENCHMARK RESULTS')
  console.log('='.repeat(80))

  console.table(results.map(r => ({
    Model: `${r.model.label} (${r.model.dtype})`,
    VAD: r.useVad ? 'ON' : 'OFF',
    Sample: r.sample,
    'WER %': (r.wer * 100).toFixed(2),
    S: r.substitutions,
    D: r.deletions,
    I: r.insertions,
    'Time (s)': (r.durationMs / 1000).toFixed(1),
  })))

  const resultsDir = path.resolve(__dirname, 'results')
  fs.mkdirSync(resultsDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outFile = path.join(resultsDir, `benchmark-${ts}.json`)
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
  console.log(`\nResults saved: ${outFile}`)
})
