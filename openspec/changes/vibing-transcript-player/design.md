## Context

這是一個 greenfield 純前端專案，目標是提供「拖入 MP3 → 自動轉寫 → 逐字點擊跳播」的一站式英文學習工具。市面上沒有高品質的簡單開源工具做這件事（詳見 proposal.md）。

使用者是個人英文學習者，典型使用場景為 5-15 分鐘的 podcast/audiobook 片段，在 macOS Chrome 上操作。

## Goals / Non-Goals

**Goals:**

- 零部署成本：純靜態檔案，可直接開啟或部署到任何靜態 hosting
- 零後端依賴：音檔不離開使用者機器，完全隱私
- 一站式體驗：拖入即轉寫，不需額外工具或步驟
- MVP 等級：在最少程式碼量下驗證核心體驗（點字跳播 + 自動高亮）

**Non-Goals:**

- Production SaaS：不考慮多使用者、認證、資料庫
- 長音檔（>30 分鐘）：不做特別優化，超過可能會慢但不會 crash
- 多語言 UI：介面只用英文
- 編輯/匯出逐字稿：MVP 不做，未來可加
- 即時串流轉寫：只做批次轉寫
- Service Worker / PWA 離線：依賴瀏覽器原生 HTTP cache + IndexedDB cache，不額外實作 SW

## Decisions

### 1. 純前端架構（vs 後端轉寫）

**選擇**：transformers.js 在瀏覽器端執行 Whisper，零後端。

**替代方案考慮**：
- Python FastAPI + faster-whisper：轉寫速度快，但需要 Python 環境、使用者要跑 `pip install`、音檔需上傳到後端
- Node/Go + whisper.cpp binding：比 Python 輕，但仍需編譯 native module、起 server
- CLI 解耦（後端 exec whisper-cli）：語言無關，但仍需裝 whisper 二進位檔

**選擇理由**：
- 目標使用者是個人學習者，不是 SaaS —— 零部署是最高優先
- transformers.js 的 ONNX Runtime WASM 在現代瀏覽器上已足夠處理 5-15 分鐘音檔
- 音檔不離開機器，完全隱私
- 只需 2 個靜態檔案，甚至可以 `file://` 開啟（需處理 Worker 跨域問題）

### 2. transformers.js + Web Worker

**選擇**：`@huggingface/transformers` 從 CDN 載入，在 Web Worker 中執行 ASR pipeline。

**架構**：
```
index.html (主線程)                     worker.js (Worker 線程)
├─ UI 渲染、事件處理                     ├─ import transformers.js from CDN
├─ <audio> 播放控制                      ├─ pipeline('automatic-speech-recognition',
├─ postMessage(audioData) ──────────►    │    'onnx-community/whisper-base')
│                                        ├─ transcriber(audio, {
│                                        │    return_timestamps: 'word',
│  ◄────────────── postMessage(result)   │    chunk_length_s: 30,
├─ 渲染 <span data-m data-d> 逐字稿     │    stride_length_s: 5
└─ timeupdate 高亮同步                   │  })
                                         └─ postMessage({ status, result })
```

**為什麼用 Web Worker**：
- Whisper 推論是 CPU 密集運算，在主線程會凍結 UI
- Worker 可以 post progress messages（模型下載、轉寫進度）保持 UI 互動

**模型選擇**：`onnx-community/whisper-base`（~150MB）
- `tiny`（~75MB）品質太差，英文單字常轉錯
- `base`（~150MB）品質與大小的最佳平衡，英文準確率可接受
- `small`（~460MB）首次下載太大，個人學習場景 base 已足夠

### 3. Vanilla JS（vs 前端框架）

**選擇**：純 HTML + CSS + JS，不用 React/Vue/Svelte。

**理由**：
- 互動極簡：drop zone → 轉寫 → span 渲染 → audio timeupdate 高亮
- 總共 ~200-300 行 JS，框架的 boilerplate 反而比業務邏輯多
- 零 build step、零 `node_modules`、零打包工具
- 如果 MVP 驗證成功且要加功能（編輯、匯出、多檔），再遷移框架

### 4. Word span 格式（data-start / data-end）

**選擇**：每個字渲染為 `<span data-start="{ms}" data-end="{ms}">`，使用自解釋的屬性名。

**格式定義**：
- `data-start`：word 起始時間，毫秒（整數）
- `data-end`：word 結束時間，毫秒（整數）
- 範例：`<span data-start="5230" data-end="5650">beautiful</span>`

**為什麼不用 hyperaudio-lite 的 data-m/data-d 格式**：
- 我們不引入 hyperaudio-lite library，不需要遵循它的命名
- `data-m`（millisecond）和 `data-d`（duration）縮寫不直覺，不看文件看不懂
- `data-start` / `data-end` 自解釋，高亮判斷直接 `start <= currentTime < end`

**transformers.js → data-start/data-end 轉換**：
```javascript
// transformers.js 回傳：{ text: "Hello", timestamp: [0.00, 0.42] }
// 轉換為：<span data-start="0" data-end="420">Hello</span>
span.dataset.start = Math.round(chunk.timestamp[0] * 1000);
span.dataset.end = Math.round(chunk.timestamp[1] * 1000);
```

### 5. 高亮同步機制

**選擇**：監聽 `<audio>` 的 `timeupdate` 事件，binary search 找當前 word。

**timeupdate 頻率**：瀏覽器約 4 次/秒（250ms 間隔），對 word-level 同步已足夠。

**演算法**：
1. 預先建立一個已排序的 word 陣列 `[{ el, start, end }, ...]`
2. `timeupdate` 時取 `audio.currentTime`，用 binary search 找到 `start <= currentTime < end` 的 word
3. 如果找到的 word 跟上一個不同，移除舊的 `.active` class，加到新的
4. Binary search 是 O(log n)，1000 個字也只需 ~10 次比較

**為什麼不用 requestAnimationFrame**：
- rAF 是 60fps，對 word 級同步過度（每秒 60 次 vs 每秒 4-5 個字的切換頻率）
- timeupdate 已經夠精準，且 CPU 成本更低

### 6. 音檔分段處理（Chunked Processing）

**選擇**：`chunk_length_s: 30`，`stride_length_s: 5`。

**機制**：transformers.js 自動把長音檔切成 30 秒的片段，每段有 5 秒重疊（stride），處理完後自動合併結果。

**為什麼需要 stride**：避免在切割邊界處丟失或截斷字詞。5 秒重疊讓邊界處的字詞有足夠上下文。

**記憶體影響**：一次只處理 30 秒的音頻張量，不會把整段音檔的中間結果都留在記憶體。峰值 RAM 約 300-400MB（模型 ~200MB + 當前 chunk 的中間張量 ~50-100MB + 音檔 PCM ~20MB）。

### 7. Segment 分段邏輯

**選擇**：使用 transformers.js 回傳的原生 segment 邊界做段落分隔。

**方式**：transformers.js 的 `return_timestamps: 'word'` 回傳 chunks 是一個 flat array。但 Whisper 模型本身會在語音自然停頓處斷句。利用 word 之間的時間間隔（gap > 0.8 秒）作為段落分隔依據，在前端渲染時插入 `<p>` 或 `<br>` 分段。

**備案**：如果 gap 分段效果不佳，可回退到固定每 N 個字（例如 30 個字）強制分段。

## Risks / Trade-offs

### [Risk] 首次下載 ~150MB 模型
**影響**：使用者第一次使用需要等待模型下載，在慢網路下可能需要數分鐘。
**緩解**：顯示下載進度條。快取在 IndexedDB/Cache API 後不需重下。模型大小是 whisper-base 的固有限制，無法進一步壓縮。

### [Risk] 轉寫速度依賴使用者硬體
**影響**：在低端設備上，10 分鐘音檔可能需要 5-10 分鐘轉寫。在 M1+ Mac 上通常 1-2 分鐘。
**緩解**：Web Worker 保持 UI 不凍結。顯示轉寫進度讓使用者知道還在處理。MVP 不做即時串流，使用者可接受「等一下」。

### [Risk] WebGPU 碎片化
**影響**：transformers.js 支援 WebGPU 加速，但各瀏覽器支援程度不同。Chrome 113+ 支援，Safari 18+ 部分支援，Firefox 尚未正式支援。
**緩解**：transformers.js 會自動 fallback 到 WASM（CPU），只是較慢。MVP 不需特別處理，WASM fallback 就是保底。

### [Risk] 長音檔可能讓 tab crash
**影響**：>30 分鐘的音檔在低 RAM 設備上，chunked processing 的累積可能觸發瀏覽器 tab crash。
**緩解**：MVP 範圍是 5-15 分鐘音檔。100MB 檔案上限已在 spec 中定義。可在 UI 加警告提示。

### [Risk] Word timestamp 精準度
**影響**：Whisper base 模型的 word-level timestamp 不是 100% 精準，尤其在快語速、連音、背景噪音時可能有 100-300ms 偏移。
**緩解**：對英文學習場景（podcast、audiobook）已夠用。使用者可點擊跳回重聽，不需要精確到毫秒。

### [Trade-off] CDN 依賴 vs 完全自含
**選擇**：transformers.js 從 CDN（jsDelivr/unpkg）載入。
**代價**：首次載入需要網路。CDN 掛掉時無法使用。
**理由**：transformers.js 打包 > 1MB，inline 到 HTML 不實際。瀏覽器會快取 CDN 資源。完全離線的場景可後續加 Service Worker。

## Open Questions

1. **Segment 分段閾值**：用多大的時間間隔（gap）作為段落分隔？0.8 秒？1.0 秒？需要實際測試幾個音檔來調整。
2. **Auto-scroll**：播放時是否自動捲動到當前高亮的字？MVP 可先不做，但長逐字稿時很有用。
3. **`file://` 支援**：Web Worker 在 `file://` protocol 下有跨域限制。是否需要提供一個 minimal HTTP server 的指引（如 `python -m http.server`）？
