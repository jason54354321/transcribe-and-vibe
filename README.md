# Vibe Transcription

Local, private, in-browser audio transcription powered by [Whisper](https://github.com/openai/whisper) via [Transformers.js](https://huggingface.co/docs/transformers.js).

All processing happens entirely in your browser — no audio is ever uploaded to a server.

## Features

- **Drag & drop** audio files (mp3, wav, m4a, ogg, up to 100 MB)
- **Word-level timestamps** — click any word to seek the audio
- **Interactive transcript** — auto-highlights the current word during playback
- **Model download progress** — per-file progress bars while loading ONNX weights
- **Zero backend** — runs on WebAssembly, works offline after first model download

## Tech Stack

- **Vue 3** + Composition API (SFC)
- **Vite 8** — dev server & production bundler
- **Transformers.js v3** — Whisper inference via ONNX Runtime (WASM)
- **Playwright** — E2E tests with mock worker for fast iteration

## Model

Uses [`onnx-community/whisper-small_timestamped`](https://huggingface.co/onnx-community/whisper-small_timestamped) with `q8` quantization (~249 MB download). Supports 99 languages with word-level timestamps.

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check + build for production
bun run build

# Preview production build
bun run static
```

## Testing

```bash
# Fast tests (mock worker, ~7s)
bun run test

# Slow E2E test (real Whisper model, ~20s)
bun run test:slow

# All tests
bun run test:all
```

## Project Structure

```
src/
  App.vue                        # Main app layout & orchestration
  components/
    AudioPlayer.vue              # Sticky audio player with time tracking
    DropZone.vue                 # Drag & drop file upload
    StatusBar.vue                # Model info, download progress, filler messages
    TranscriptView.vue           # Word-level transcript with click-to-seek
  composables/
    useTranscriber.ts            # Web Worker communication & state management
    useFileUpload.ts             # File validation & audio decoding
public/
  worker.js                      # Whisper ASR engine (Web Worker)
tests/
  fast.spec.ts                   # 16 fast tests with mock worker
  slow.spec.ts                   # E2E test with real model
  fixtures.ts                    # Mock worker & test utilities
```

## License

[MIT](LICENSE)
