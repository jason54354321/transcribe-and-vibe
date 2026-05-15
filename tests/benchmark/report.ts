/// <reference types="node" />
import * as fs from 'node:fs'
import * as path from 'node:path'

import type { BenchmarkRuntime, BenchmarkRunResult } from './config'
import { formatBenchmarkDuration } from './wer'

type RuntimeInfo = {
  expectedRuntime: BenchmarkRuntime
  acceleration: BenchmarkRuntime
  hardware: string
  engine: string
  executionBackend: string
  device: string
}

type PersistedBenchmarkResult = BenchmarkRunResult & {
  usedTime: string
}

type BenchmarkReportPayload = {
  generatedAt: string
  runtime: RuntimeInfo
  results: PersistedBenchmarkResult[]
}

export type BenchmarkBackendInfo = {
  hardware: string
  device: string
  engine: string
  execution_backend: string
  acceleration: string
}

type BenchmarkRow = {
  model: string
  sample: string
  usedTime: string
  wer: string
  substitutions: number
  deletions: number
  insertions: number
}

export function assertExpectedRuntime(
  expectedRuntime: BenchmarkRuntime,
  info: BenchmarkBackendInfo,
): RuntimeInfo {
  const acceleration =
    info.acceleration === 'cpu' ? 'cpu' : info.acceleration === 'gpu' ? 'gpu' : null

  if (acceleration == null) {
    throw new Error(
      `Benchmark runtime check failed: backend returned unsupported acceleration=${info.acceleration}. ` +
        `hardware=${info.hardware}, engine=${info.engine}, execution_backend=${info.execution_backend}, device=${info.device}`,
    )
  }

  if (acceleration !== expectedRuntime) {
    throw new Error(
      `Benchmark expected ${expectedRuntime.toUpperCase()} but backend is running ${acceleration.toUpperCase()}. ` +
        `hardware=${info.hardware}, engine=${info.engine}, execution_backend=${info.execution_backend}, device=${info.device}`,
    )
  }

  return {
    expectedRuntime,
    acceleration,
    hardware: info.hardware,
    engine: info.engine,
    executionBackend: info.execution_backend,
    device: info.device,
  }
}

export function createBenchmarkTimestamp(now: Date = new Date()): string {
  return now.toISOString().replace(/[:.]/g, '-')
}

function toBenchmarkRow(result: BenchmarkRunResult): BenchmarkRow {
  return {
    model: result.model.label,
    sample: result.sample,
    usedTime: formatBenchmarkDuration(result.durationMs),
    wer: `${(result.wer * 100).toFixed(2)}%`,
    substitutions: result.substitutions,
    deletions: result.deletions,
    insertions: result.insertions,
  }
}

function toPersistedResult(result: BenchmarkRunResult): PersistedBenchmarkResult {
  return {
    ...result,
    usedTime: formatBenchmarkDuration(result.durationMs),
  }
}

function formatMarkdownTable(rows: BenchmarkRow[]): string {
  const header = '| model | sample | usedTime | wer | substitutions | deletions | insertions |'
  const separator = '| --- | --- | --- | --- | --- | --- | --- |'
  const body = rows.map((row) => {
    return `| ${row.model} | ${row.sample} | ${row.usedTime} | ${row.wer} | ${row.substitutions} | ${row.deletions} | ${row.insertions} |`
  })

  return [header, separator, ...body].join('\n')
}

export function writeBenchmarkArtifacts(
  results: BenchmarkRunResult[],
  runtime: RuntimeInfo,
  now: Date = new Date(),
  rootDir: string = process.cwd(),
): string {
  const timestamp = createBenchmarkTimestamp(now)
  const outputDir = path.join(path.resolve(rootDir, 'tests/benchmark/results'), timestamp)
  const rows = results.map(toBenchmarkRow)
  const payload: BenchmarkReportPayload = {
    generatedAt: now.toISOString(),
    runtime,
    results: results.map(toPersistedResult),
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(
    path.join(outputDir, 'results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8',
  )

  const markdown = [
    '# Benchmark Results',
    '',
    `- generatedAt: ${payload.generatedAt}`,
    `- expectedRuntime: ${runtime.expectedRuntime}`,
    `- acceleration: ${runtime.acceleration}`,
    `- hardware: ${runtime.hardware}`,
    `- engine: ${runtime.engine}`,
    `- executionBackend: ${runtime.executionBackend}`,
    `- device: ${runtime.device}`,
    '',
    formatMarkdownTable(rows),
    '',
  ].join('\n')

  fs.writeFileSync(path.join(outputDir, 'summary.md'), markdown, 'utf-8')

  return outputDir
}

export function buildBenchmarkResultsTable(results: BenchmarkRunResult[]): string {
  return formatMarkdownTable(results.map(toBenchmarkRow))
}
