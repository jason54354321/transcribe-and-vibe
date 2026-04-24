## Context

Vibe 目前同時維護兩條轉錄路徑：後端可用時走 `useBackendTranscriber.ts` + FastAPI SSE，後端不可用時退回 `useTranscriber.ts` + `worker.ts` 的瀏覽器內推論。雖然這提供了離線能力，但也讓模式偵測、錯誤訊息、模型選擇、測試基礎設施與使用者心智模型都分裂成兩套。

現有後端其實已經支援 CPU-only 執行：`backend/engine/hardware.py` 會在沒有 Apple Silicon MLX 或 NVIDIA CUDA 時退回 `faster-whisper` 的 CPU 模式。這次 change 的本質不是新增新的推論引擎，而是把產品從 dual-mode 收斂成 backend-only，並讓 CPU 模式成為正式支援的後端執行型態。

## Goals / Non-Goals

**Goals:**
- 將前端轉錄流程統一成單一路徑，所有音訊都送往後端 `POST /api/transcribe`
- 移除前端 Worker/ONNX fallback 與相關 UI、狀態管理、測試假設
- 將後端自動 fallback 到 CPU 的行為明確化，包含合理預設模型與使用者可理解的狀態訊息
- 在轉錄畫面新增 runtime info 區域，顯示偵測到的架構、目前使用模型，以及目前使用的 CUDA / MLX / CPU 執行模式
- 保持既有 transcript result shape、SSE 進度顯示、session persistence 與播放互動不變
- 讓規格與測試都反映「後端不可達即無法轉錄」的新產品契約

**Non-Goals:**
- 不新增新的遠端雲端服務或多租戶能力
- 不在這個 change 內重新設計 transcript 呈現、播放器互動或 session schema
- 不保留隱藏的瀏覽器內 ASR 備援模式
- 不在這個 change 內擴充新的 ASR 模型家族或新的 API endpoint

## Decisions

### D1: 前端轉錄改為 backend-only 單一路徑
**Choice**: 前端只保留 `useBackendTranscriber` 這條路徑，移除 `useTranscriber`、`worker.ts`、`models.ts` 與任何依賴瀏覽器端 Whisper 的控制流程。

**Alternatives considered:**
- 保留 Worker 程式碼但只是不自動 fallback
- 保留隱藏的 developer-only offline 模式

**Rationale:**
如果仍保留可運作的第二條路徑，模式切換、測試與文件仍會持續分叉。這個 change 的價值就在於把轉錄 contract 縮成一條線，而不是把 fallback 改得更不明顯。

### D2: 後端不可達改為明確阻擋，而非警告後繼續 fallback
**Choice**: `GET /api/info` 失敗時，前端顯示持續性的不可用狀態；選檔後若後端仍不可達，轉錄請求直接失敗並顯示可操作的錯誤訊息。

**Alternatives considered:**
- 維持現有 warning banner，但允許使用者繼續走瀏覽器轉錄
- 在後端不可達時停用選檔功能

**Rationale:**
產品契約既然改為 backend-only，就不應再用 warning 的語氣暗示「還有其他隱藏路徑可用」。保留上傳入口但在轉錄時明確失敗，比完全封鎖 UI 更容易理解與除錯。

### D3: 後端保留自動 fallback 到 CPU 的能力
**Choice**: 保留現有 `faster-whisper` CPU engine，並把「無 MLX / CUDA 時自動 fallback 到 CPU」寫進產品規格，讓無 GPU 機器也能使用但對速度有合理預期。

**Alternatives considered:**
- 將 CPU 視為僅供開發用途，不對使用者承諾
- 沒有 GPU 就直接視為 unsupported

**Rationale:**
程式碼已經支援 CPU fallback；真正缺的是產品層與 spec 層的承認。把 fallback 規則與預設模型寫清楚，可以消除「後端存在但不確定是否算支援模式」的模糊地帶。

### D4: 轉錄畫面顯示實際 runtime info
**Choice**: 前端在轉錄畫面顯示一個資訊區域，呈現後端回報的硬體架構、目前模型，以及目前實際執行後端（CUDA / MLX / CPU）。

**Alternatives considered:**
- 只在 console 或 debug log 顯示 runtime 資訊
- 只在設定頁顯示預設模型與硬體，不顯示當前 session 實際執行資訊

**Rationale:**
這次 change 把所有轉錄都集中到後端後，使用者需要知道當前到底是跑在 GPU 還是 CPU，以及使用了哪個 model，才能理解速度、結果與系統狀態。把 runtime info 放進轉錄畫面，比藏在設定或 log 裡更符合實際使用情境。

### D5: 維持既有後端 API contract，僅補齊 chunk-level progress event
**Choice**: 繼續使用既有 `POST /api/transcribe` + SSE 事件模型，保留 `{ text, chunks, model, dtype }` 結果格式與既有 `transcribing` 百分比事件，同時補上 `transcription-progress` chunk-level 事件以對齊規格。

**Alternatives considered:**
- 為 CPU-only 模式新增專用 endpoint 或事件格式
- 重新設計前後端資料格式以區分 CPU 與 GPU

**Rationale:**
這次 change 的目標是收斂 execution path，不是擴張 API surface。保留既有 endpoint 與主要 payload 形狀，僅補齊規格已要求的 chunk-level progress event，可以讓前端與測試取得更精確的進度資訊，同時避免連帶改壞 transcript rendering 與 session persistence。

### D6: 測試策略從 mock Worker 轉為 mock backend/SSE
**Choice**: 既有 fast tests 改以 mock backend 回應與 SSE 事件為主，移除對 mock worker 與瀏覽器端 VAD/ONNX fallback 的依賴。

**Alternatives considered:**
- 保留現有 worker mocks，只在少數測試改 backend
- 把 fast tests 全數升級成真正啟 backend 的整合測試

**Rationale:**
測試應跟產品真實 contract 對齊。既然前端不再有 Worker 路徑，繼續用 mock worker 當主要測試基礎會讓測試與產品脫節。

## Risks / Trade-offs

- **[失去離線能力]** → 使用者無法在後端未啟動時轉錄；以明確錯誤訊息與文件說明緩解。
- **[隱私敘事改變]** → 音訊不再保證停留在瀏覽器記憶體內；以 local/backend-first 定位與 UI 文案明確揭露緩解。
- **[CPU fallback 較慢]** → 長音訊在 CPU-only 環境等待時間會顯著增加；以 CPU-safe 預設模型、runtime info 與進度訊息緩解。
- **[測試重寫成本]** → 既有 fast Playwright 測試大量依賴 mock worker；以分階段轉換 fixture 與 selector 兼容性檢查緩解。
- **[殘留死碼風險]** → Worker/VAD/ONNX 周邊若移除不完整，容易留下未使用設定與文件；以 tasks 明確列出清理範圍緩解。

## Migration Plan

1. 先更新 spec 與 design，明確宣告 backend-only 契約與 CPU mode 定位。
2. 實作前端 orchestration 簡化：移除 mode toggle、Worker 路徑、瀏覽器模型選擇與 fallback banner 文案。
3. 調整 backend info / default-model 呈現與前端資訊區，確保 CPU-only 機器能以可預期方式工作並顯示實際 runtime metadata。
4. 將 fast tests 改寫成 backend/SSE 導向，補上後端不可達、CPU fallback 與 runtime info UX 驗證。
5. 驗證 `bun run build`、相關單元/端對端測試後再進入 apply/implementation。

Rollback strategy: 若實作期間發現 CPU-only UX 或測試基礎設施尚未收斂，可回退到保留現有 dual-mode 行為，因為後端 API 與 Worker 路徑在此 change 前原本就並存。

## Open Questions

- CPU fallback 預設模型要固定為 `base` 還是允許 `small` 作為預設，是否需要依硬體能力進一步區分？
- runtime info 區域要顯示的是「偵測架構 + 實際執行後端 + active model」三欄固定資訊，還是要額外顯示 precision / dtype？
- 這次 change 是否要順手把 `gpu-transcription-api` 的 capability 命名泛化，或先只修改其 requirement 內容？
