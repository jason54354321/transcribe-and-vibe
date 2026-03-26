## Why

學英文時需要反覆聽 MP3 的特定片段，但一般播放器只能拖進度條，無法精準跳到某個字。市面工具要嘛需要 API key（Transcript Seeker）、要嘛是桌面應用（WhisperDesk）、要嘛流程太繁瑣（先產 SRT 再載入播放器）。需要一個**一站式 web 工具**：丟 MP3 進去，馬上得到可點擊的逐字稿，點任何一個字就跳到該時間點播放。

## What Changes

這是全新專案（greenfield），純前端架構，不需要後端：

- 新增單頁前端（`index.html` + `worker.js`），使用 vanilla JS，無框架
- 透過 transformers.js 在瀏覽器端以 Web Worker 執行 Whisper 模型，產生 word-level 逐字稿
- 提供拖曳上傳、逐字稿渲染、點字跳播、自動高亮
- transformers.js 從 CDN 載入，Whisper 模型首次使用時下載並快取在 IndexedDB

## Capabilities

### New Capabilities

- `audio-transcription`: 在瀏覽器端透過 transformers.js + Web Worker 執行 Whisper 模型，將音訊轉寫為 word-level JSON（每個字含 start/end 時間戳）
- `interactive-player`: 前端單頁應用（vanilla HTML+JS+CSS），整合音訊播放器與逐字稿互動（點字跳播、播放時自動高亮當前字詞）

### Modified Capabilities

（無，全新專案）

## Impact

- **零後端依賴**：純靜態檔案，可部署到任何靜態 hosting（GitHub Pages、S3、甚至 `file://` 開啟）
- **首次載入**：需下載 Whisper base 模型（~150MB），快取在瀏覽器 IndexedDB，之後不用重下
- **硬體需求**：現代瀏覽器即可（Chrome 113+、Safari 18+），有 WebGPU 會更快但非必要
- **隱私**：音檔完全不離開使用者的機器，不經過任何伺服器
- **網路**：僅首次載入 transformers.js 和模型需要網路，之後完全離線運作
- **新增檔案**：`index.html`、`worker.js`（共 2 檔）
