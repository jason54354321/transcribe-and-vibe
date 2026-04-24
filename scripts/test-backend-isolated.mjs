import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const backendDir = resolve(repoRoot, 'backend')
const preferredPorts = {
  backend: 8081,
  frontend: 4173,
}

async function findFreePort(preferredPort) {
  const preferred = await tryListen(preferredPort)
  if (preferred !== null) return preferred
  return await listenOnEphemeralPort()
}

function tryListen(port) {
  return new Promise((resolvePort) => {
    const server = createServer()
    server.once('error', () => resolvePort(null))
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const resolvedPort = typeof address === 'object' && address ? address.port : null
      server.close(() => resolvePort(resolvedPort))
    })
  })
}

function listenOnEphemeralPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address !== 'object' || !address) {
        server.close()
        reject(new Error('Failed to allocate an ephemeral port'))
        return
      }

      server.close((err) => {
        if (err) {
          reject(err)
          return
        }

        resolvePort(address.port)
      })
    })
  })
}

function spawnManaged(name, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logBuffer = []
  const maxEntries = 60

  const appendLog = (prefix, chunk) => {
    const text = chunk.toString().trim()
    if (!text) return

    for (const line of text.split('\n')) {
      logBuffer.push(`[${name}] ${prefix}${line}`)
      if (logBuffer.length > maxEntries) {
        logBuffer.shift()
      }
    }
  }

  child.stdout?.on('data', (chunk) => appendLog('', chunk))
  child.stderr?.on('data', (chunk) => appendLog('ERR ', chunk))

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`${name} exited with code ${code}\n`)
    }
    if (signal) {
      process.stderr.write(`${name} exited with signal ${signal}\n`)
    }
  })

  return { child, logBuffer }
}

async function waitForUrl(url, name, timeoutMs = 20_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until timeout.
    }

    await Bun.sleep(200)
  }

  throw new Error(`Timed out waiting for ${name} at ${url}`)
}

async function terminateProcess(child) {
  if (child.exitCode !== null) return

  child.kill('SIGTERM')

  const exited = await Promise.race([
    once(child, 'exit').then(() => true),
    Bun.sleep(5_000).then(() => false),
  ])

  if (!exited && child.exitCode === null) {
    child.kill('SIGKILL')
    await once(child, 'exit')
  }
}

const managedProcesses = []
let cleaningUp = false

async function cleanup() {
  if (cleaningUp) return
  cleaningUp = true

  for (const processInfo of managedProcesses.reverse()) {
    await terminateProcess(processInfo.child)
  }
}

process.on('SIGINT', async () => {
  await cleanup()
  process.exit(130)
})

process.on('SIGTERM', async () => {
  await cleanup()
  process.exit(143)
})

let exitCode = 1

try {
  const backendPort = await findFreePort(preferredPorts.backend)
  const frontendPort = await findFreePort(preferredPorts.frontend)
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`
  const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`

  process.stdout.write(`Starting isolated backend on ${backendBaseUrl}\n`)
  const backend = spawnManaged(
    'backend',
    './.venv/bin/python',
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(backendPort)],
    { cwd: backendDir, env: process.env },
  )
  managedProcesses.push(backend)

  process.stdout.write(`Starting isolated frontend on ${frontendBaseUrl}\n`)
  const frontend = spawnManaged(
    'frontend',
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(frontendPort)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        BACKEND_PORT: String(backendPort),
      },
    },
  )
  managedProcesses.push(frontend)

  await waitForUrl(`${backendBaseUrl}/api/info`, 'backend')
  await waitForUrl(frontendBaseUrl, 'frontend')

  process.stdout.write('Running backend Playwright tests against isolated services\n')
  const playwright = spawn('bunx', ['playwright', 'test', '--project=backend'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      BACKEND_PORT: String(backendPort),
      PLAYWRIGHT_BASE_URL: frontendBaseUrl,
      PLAYWRIGHT_EXTERNAL_WEBSERVER: '1',
    },
    stdio: 'inherit',
  })

  const [code, signal] = await once(playwright, 'exit')
  if (signal) {
    throw new Error(`Playwright exited with signal ${signal}`)
  }

  exitCode = code ?? 1
  if (exitCode !== 0) {
    throw new Error(`Playwright exited with code ${exitCode}`)
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`${message}\n`)

  for (const processInfo of managedProcesses) {
    if (processInfo.logBuffer.length > 0) {
      process.stderr.write(`${processInfo.logBuffer.join('\n')}\n`)
    }
  }
} finally {
  await cleanup()
}

process.exit(exitCode)
