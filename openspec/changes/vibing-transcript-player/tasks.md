## 1. Project Setup

- [x] 1.1 Create project directory structure with `index.html` and `worker.js`
- [x] 1.2 Set up `index.html` skeleton with inline CSS, `<audio>` element, drop zone, and transcript container

## 2. Web Worker — Transcription Engine

- [x] 2.1 Implement `worker.js`: import transformers.js from CDN, create ASR pipeline with `onnx-community/whisper-base`
- [x] 2.2 Handle `message` event in worker: receive audio ArrayBuffer, run pipeline with `return_timestamps: 'word'` and `chunk_length_s: 30`
- [x] 2.3 Post progress messages back to main thread (model loading status, transcription in-progress)
- [x] 2.4 Post final transcription result back to main thread, including detected language
- [x] 2.5 Wrap worker logic in try/catch, post error messages on failure

## 3. File Input — Drag-and-Drop & File Picker

- [x] 3.1 Implement drag-and-drop zone with dragover/dragleave/drop visual feedback
- [x] 3.2 Implement file picker button as fallback
- [x] 3.3 Validate file type (mp3/wav/m4a/ogg by MIME) and size (<100MB), show error for invalid files
- [x] 3.4 On valid file: read as ArrayBuffer, create Object URL for `<audio>` element, post ArrayBuffer to worker

## 4. Progress UI

- [x] 4.1 Show loading indicator with status text when worker is processing (model download, transcribing)
- [x] 4.2 Update status text on each worker progress message
- [x] 4.3 Hide loading indicator and show transcript when result is received
- [x] 4.4 Show error message and return to upload state on worker error/crash

## 5. Transcript Rendering

- [x] 5.1 Convert worker result chunks to `<span data-start="{ms}" data-end="{ms}">word</span>` elements
- [x] 5.2 Group words into paragraphs by detecting time gaps (>0.8s between consecutive words)
- [x] 5.3 Display detected language in UI
- [x] 5.4 Add hover CSS for word spans (cursor pointer, underline/highlight on hover)

## 6. Click-to-Seek Playback

- [x] 6.1 Add click event listener on transcript container (event delegation)
- [x] 6.2 On word click: parse `data-start`, seek `<audio>` to that time, start playback

## 7. Auto-Highlight Current Word

- [x] 7.1 Build sorted word array `[{ el, start, end }, ...]` after transcript render
- [x] 7.2 Implement binary search to find current word by `audio.currentTime`
- [x] 7.3 On `timeupdate` event: find current word, toggle `.active` CSS class (remove from previous, add to current)
- [x] 7.4 Style `.active` class with distinct background color

## 8. Layout & Responsiveness

- [x] 8.1 Style audio player as sticky/fixed at top or bottom so it stays visible while scrolling
- [x] 8.2 Make transcript area scrollable when content exceeds viewport
- [x] 8.3 Add responsive CSS for mobile (full-width layout, readable font size at width < 768px)

## 9. Smoke Test

- [ ] 9.1 Test with a short English MP3 (~1-2 min): verify transcription, click-to-seek, auto-highlight all work end-to-end
- [ ] 9.2 Test error cases: invalid file type, oversized file, corrupted audio
