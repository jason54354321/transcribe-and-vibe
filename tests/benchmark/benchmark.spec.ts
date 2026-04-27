/**
 * ASR Benchmark — measures WER across runtime × model × sample matrix.
 *
 * Run:   npm run benchmark
 * Configure what runs: edit tests/benchmark/benchmark.config.json
 */
import { test } from '@playwright/test'
import { DEFAULT_MODELS } from './config'
import type { BenchmarkRunResult } from './config'
import { loadSamples } from './dataset'
import { computeWER, formatBenchmarkDuration, stripBenchmarkUiMetadata } from './wer'

test('ASR benchmark: runtime × model × sample matrix', async ({ page }) => {
  const samples = loadSamples()
  const results: BenchmarkRunResult[] = []

  await page.goto('/')
  await page.waitForSelector('#drop-zone', { state: 'visible' })

  for (const model of DEFAULT_MODELS) {
    await page.locator('#model-select').selectOption(model.id)

    for (const sample of samples) {
      console.log(`\n--- ${model.label} | ${sample.id} ---`)

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
      const hardware =
        (await page.locator('#runtime-architecture .runtime-value').textContent()) ?? 'N/A'
      const executionBackend =
        (await page.locator('#runtime-execution-backend .runtime-value').textContent()) ?? 'N/A'
      const transcriptText = (await page.locator('#transcript-content').textContent()) ?? ''
      const hypothesis = stripBenchmarkUiMetadata(transcriptText)
      const wer = computeWER(hypothesis, sample.reference)

      results.push({
        model,
        sample: sample.id,
        hardware: hardware.trim(),
        executionBackend: executionBackend.trim(),
        hypothesis: hypothesis.trim(),
        reference: sample.reference,
        wer: wer.wer,
        substitutions: wer.substitutions,
        deletions: wer.deletions,
        insertions: wer.insertions,
        durationMs,
      })

      console.log(`  WER: ${(wer.wer * 100).toFixed(2)}%`)
      console.log(
        `  S=${wer.substitutions} D=${wer.deletions} I=${wer.insertions} (ref=${wer.referenceWords} words)`,
      )
      console.log(`  Runtime: ${hardware.trim()} / ${executionBackend.trim()}`)
      console.log(`  Time: ${formatBenchmarkDuration(durationMs)}`)

      await page.locator('.new-btn').click()
      await page.locator('#drop-zone').waitFor({ state: 'visible', timeout: 10_000 })
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('BENCHMARK RESULTS')
  console.log('='.repeat(80))

  console.table(
    results.map((r) => ({
      Architecture: r.hardware,
      Backend: r.executionBackend,
      Model: r.model.label,
      Sample: r.sample,
      'WER %': (r.wer * 100).toFixed(2),
      S: r.substitutions,
      D: r.deletions,
      I: r.insertions,
      Time: formatBenchmarkDuration(r.durationMs),
    })),
  )
})
