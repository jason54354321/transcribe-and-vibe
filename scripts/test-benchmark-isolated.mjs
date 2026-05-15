import process from 'node:process'
import { runIsolatedPlaywrightProject } from './playwright-isolated-runner.mjs'

let exiting = false

async function runAndExit(signalExitCode) {
  if (exiting) return
  exiting = true
  process.exit(signalExitCode)
}

process.on('SIGINT', () => runAndExit(130))
process.on('SIGTERM', () => runAndExit(143))

const exitCode = await runIsolatedPlaywrightProject({
  projectName: 'benchmark',
  runLabel: 'benchmark Playwright tests against isolated services',
})

process.exit(exitCode)
