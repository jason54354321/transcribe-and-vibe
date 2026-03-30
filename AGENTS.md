# AGENTS.md — Vibe Transcription

In-browser audio transcription app. Vue 3 + Vite 8 + TypeScript 6 (strict mode).
Whisper ASR runs in a Web Worker; Silero VAD runs in the main thread.

## Build & Test Commands

```bash
npm run dev              # Vite dev server on localhost:5173
npm run build            # vue-tsc type-check + vite build (MUST pass before PR)
npm run test             # Playwright fast tests (mock worker, ~10s)
npm run test:slow        # Playwright slow tests (real Whisper model, ~20s, downloads ~150MB on first run)
npm run test:all         # All Playwright projects
npm run test:unit        # Vitest unit tests (src/**/*.test.ts)
```

### Running a single test

```bash
# Playwright — by test name substring
npx playwright test --project=fast -g "file upload shows transcript"

# Playwright — by file
npx playwright test tests/fast.spec.ts --project=fast

# Vitest — by file
npx vitest run src/utils/vadPipeline.test.ts

# Vitest — by test name
npx vitest run -t "merges two segments"
```

### Type checking only

```bash
npx vue-tsc -b          # Same check as `npm run build` first step
```

## Project Structure

```
public/worker.js              # Web Worker — Whisper ASR via @huggingface/transformers (CDN import)
src/
  main.ts                     # App entry
  App.vue                     # Root component, orchestrates file upload → transcribe → display
  components/
    DropZone.vue              # Drag-and-drop file input
    AudioPlayer.vue           # <audio> element wrapper with seek support
    StatusBar.vue             # Progress/status display during transcription
    TranscriptView.vue        # Word-level transcript with click-to-seek and auto-highlight
  composables/
    useTranscriber.ts         # Core pipeline: VAD → segment → Whisper Worker → merge results
    useFileUpload.ts          # File validation + AudioContext decoding to Float32Array
    useAudioPlayer.ts         # Audio playback state (currentTimeMs, seekTo)
  utils/
    vadPipeline.ts            # Pure functions: mergeVadSegments, offsetTimestamps, sliceAudio
    vadPipeline.test.ts       # Vitest unit tests for above
tests/
  fixtures.ts                 # Mock worker script, MockAudioContext, test helpers
  fixtures/test_vibe.m4a      # Real audio fixture for E2E
  fast.spec.ts                # 16 Playwright tests with mock worker (VAD routes blocked → fallback)
  slow.spec.ts                # 1 Playwright test with real Whisper model
```

## Architecture Notes

- **Worker isolation**: `public/worker.js` imports `@huggingface/transformers` from CDN (not bundled). It uses plain JS, NOT TypeScript. The worker communicates via `postMessage` with typed message protocol.
- **VAD in main thread**: `@ricky0123/vad-web` (npm, bundled by Vite). If VAD fails to load (ONNX model unavailable), the pipeline falls back to treating the entire audio as one segment.
- **Async transcription**: `transcribe()` in `useTranscriber.ts` is async but called without `await` from `App.vue` — it manages its own lifecycle via reactive refs and try/finally.
- **Promise-based worker comm**: `pendingResolve`/`pendingReject` pattern wraps worker message passing. Only one transcription at a time.

## Code Style

No ESLint or Prettier configured. Follow these conventions observed in the codebase:

### Formatting
- 2-space indentation
- Single quotes for strings
- No semicolons
- Trailing commas in multi-line arrays/objects

### TypeScript
- `strict: true` — never weaken it
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use `type` keyword for type aliases; `interface` only for shapes with `extends` potential
- Explicit generic on `ref<T>()` when initial value doesn't convey the full type
- Error catch blocks: `catch (err: unknown)` then `err instanceof Error ? err.message : String(err)`
- Type-only imports: `import type { Foo } from '...'`

### Vue Components
- `<script setup lang="ts">` — no Options API
- SFC block order: `<script setup>` → `<template>` → `<style scoped>`
- Props via `defineProps<{ ... }>()`, emits via `defineEmits<{ ... }>()`
- Composables in `src/composables/`, named `use*.ts`, return plain objects (not arrays)
- Template refs typed as `ref<InstanceType<typeof Component> | null>(null)`

### Imports
Order: vue → external packages → local modules (relative paths)
```ts
import { ref, computed } from 'vue'
import { NonRealTimeVAD } from '@ricky0123/vad-web'
import { mergeVadSegments } from '../utils/vadPipeline'
import type { VadSegment } from '../utils/vadPipeline'
```

### Naming
- `camelCase` for variables, functions, composables, props, emits
- `PascalCase` for components, types, interfaces
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `VALID_TYPES`)
- Test files: `*.test.ts` (Vitest) in `src/`, `*.spec.ts` (Playwright) in `tests/`

### CSS
- Scoped styles (`<style scoped>`) on all components
- CSS custom properties defined in `App.vue :root` — reuse them, don't hardcode colors
- Key variables: `--accent-color`, `--border-color`, `--secondary-text`, `--spacing-unit`, `--radius`
- Use `calc(var(--spacing-unit) * N)` for spacing

### HTML / Accessibility
- Key elements have explicit `id` attributes for test selectors (e.g., `#drop-zone`, `#status-container`, `#transcript-container`, `#error-container`)
- Preserve these IDs — Playwright tests depend on them

### Error Handling
- User-facing errors go to reactive `error` ref, displayed in `#error-container`
- Never swallow errors silently; either surface to user or log
- Worker errors propagate via `{ type: 'error', message: string }` protocol
- Use `finally` blocks for cleanup (close AudioContext, reset `isProcessing`)

## Testing Conventions

### Fast tests (Playwright)
- Mock the worker via `setupMockWorker(page, options?)` from `tests/fixtures.ts`
- Mock AudioContext is injected via `page.addInitScript`
- VAD ONNX routes (`**/*silero*.onnx`, `**/ort-wasm*`) are blocked → VAD falls back
- Always wait for `#transcript-container` to be visible before asserting on transcript content
- Use `page.locator()` with CSS selectors; prefer `#id` for containers, `.class` for repeated elements

### Unit tests (Vitest)
- Co-located with source: `src/utils/foo.test.ts` tests `src/utils/foo.ts`
- Pure functions only — no DOM, no Vue component testing
- Import from vitest: `import { describe, it, expect } from 'vitest'`

### Slow tests (Playwright)
- No mocking — real worker.js, real Whisper model download
- 300s timeout; captures console errors and page errors
- Only run explicitly via `npm run test:slow`

## Worker Protocol (public/worker.js)

Messages from main thread to worker:
```
{ type: 'transcribe', audio: Float32Array }
```

Messages from worker to main thread:
```
{ type: 'progress', status: string }
{ type: 'model-info', model: string, dtype: string }
{ type: 'download-progress', file: string, progress: number, loaded: number, total: number }
{ type: 'result', data: { text: string, chunks: Array<{ text: string, timestamp: [number, number] }> } }
{ type: 'error', message: string }
```
