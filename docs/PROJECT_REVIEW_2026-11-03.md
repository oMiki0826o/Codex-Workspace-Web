# Codex Workspace Web — 完整程式碼與行動版 UI 審查報告

**審查日期：** 2026-11-03  
**審查基準：** GitHub `main` 的 `cbd328d42ed5e2005b6cb712b6b8e4c7e8d2ce5d`（含兩路模型路由）；**最終驗證：** `fccdfff75ec0b0ce38519866dfb0752d7a5c500a`  
**本次修正：** PR #3 已合併為 `c4587a55533a3c3c2e9ffbd84dd6b381ef26545f`，設定頁一致性修正 `fccdfff75ec0b0ce38519866dfb0752d7a5c500a` 已推送 `main`  
**方法：** 使用者實際 iPhone 截圖、追蹤 React DOM / CSS cascade、GitHub Actions 紅綠測試、原始碼靜態審查，及 Codex App Server 官方協定對照。  
**限制：** 無法從 CI 代替 iPhone Safari／主畫面 PWA 實機；無法驗證使用者 Ubuntu 中的 App Server、Ollama 與模型存取狀態。以下將「程式碼有實作」與「真實裝置／環境已驗收」嚴格區分。

## 1. 問題重現與根因

2026-11-03 的使用者截圖（828 × 1792 像素）顯示：頂端狀態列不再覆蓋工具列，但底部「模型／推理／工作區寫入」三個原生 `select` 水平擠在同一行，最右側的工作區選項與圓形傳送按鈕實際交疊。這不是單純字級或留白的問題。

追蹤到的實際原因：

1. `src/components/Workspace.tsx` 在 `.composer-actions` 中同時輸出三個 `.v2-chip-select` 和一個傳送鍵（執行中還加上 Stop）。
2. `src/styles/openwebui.css` 原本讓每個選擇器 `flex:0 0 auto`、`max-width:190px`，無法依窄螢幕的剩餘寬度合理縮小。
3. 原版使用 `.composer-actions { overflow-x:auto; padding-right:44px }`，但 `.send-btn` 在手機版使用 `position:absolute;right:9px;bottom:9px`，因此傳送鍵**沒有佔據 toolbar 的寬度**。
4. `src/app/globals.css` 保留 2,192 行歷史規則，最後仍有多組 `.composer-actions` 和 `.send-btn` 定位設定，疊加 `openwebui.css` 的 `!important`，提高了意外覆蓋機率。
5. 舊測試主要比對 CSS 字串，沒有驗證狹窄裝置下每一個按鈕的 bounding box 是否相交。

**因此不能用縮小三個下拉選單、再增加右側 padding 的方式根治。** 正確做法是減少同排控制項，讓傳送和停止鍵真正參與版面配置。

## 2. 已完成的本次修改

- 將模型與推理強度合併成**一個「模型」按鈕**：先選擇模型，若該模型有宣告 `reasoningEfforts`，接著進入「選擇推理強度」清單；沒有宣告則直接使用預設。輸入框與設定頁**共用相同的兩階段選擇器**，不再於設定頁放兩個獨立 `select`。
- 切換模型時清除舊強度，避免把上一個模型不支援的強度沿用到下一個模型；選擇器只使用伺服器提供的模型／強度資料，沒有硬編造固定模型名稱。
- 保留獨立「Sandbox／工作區寫入」按鈕，並由同一工具列承載「停止／傳送」。
- 將傳送／停止按鈕從 `position:absolute` 改成工具列內的 **flex normal-flow siblings**；不再覆蓋工作區控制項。
- 模型文字允許 `min-width:0` + `text-overflow:ellipsis`；在長模型名、320／375／414 CSS px 等窄螢幕時，自動縮短顯示而不推擠操作按鈕。
- 保留現有手機 Safe Area（至少 66px）、深色、左右滑手勢，以及 `visualViewport` 鍵盤處理；本次未在沒有實機證據前再次改寫鍵盤定位演算法。
- 為單一選擇器、階段切換、送出鍵不覆蓋及手機 CSS 條件新增回歸測試。

### 驗證證據

第一個測試提交 `94249eba` 在修正前如預期 **失敗**，指出舊版沒有合併模型按鈕／沒有 normal-flow 傳送鍵。修正提交 `e21172e8` 的 GitHub Actions Run `41562888904`：67 項測試通過。最後 `main` 提交 `fccdfff7` 的 GitHub Actions Run **`41564505606`：69 tests passed、0 failed；lint、typecheck、Next.js production build 全部通過**。這是程式碼與 Linux CI 驗證，**不是 iPhone Safari 實機驗證**。

## 3. 全專案審查發現

| ID | 風險 | 涉及程式 | 發現與影響 | 本次狀態／建議 |
|---|---|---|---|---|
| UI-01 | **P0 已修** | `Workspace.tsx`, `openwebui.css` | 三個 select 與絕對定位 Send 擠壓重疊，iPhone 截圖直接可重現。 | 合併模型＋推理；工具列 flex 正常流；已增加回歸測試。 |
| SEC-01 | **P0 條件風險** | `auth.mjs`, `api/auth`, `package.json` | `authorized()` 無條件 `true`，Next.js 預設綁定 `0.0.0.0`。這符合「只透過 VPN、不另加網站登入」的使用者設計，但**若公開轉發埠 3000，將允許他人操作 Codex／讀寫允許的工作區**。 | **未變更預期行為**；必須限制防火牆／VPN ACL、不得使用公開 Funnel 或反向代理暴露到公網。 |
| UI-02 | P1 待實機 | `openwebui.css`, `viewport-geometry.mjs`, `Workspace.tsx` | 頂部 Safe Area 在截圖看起來已正常，但中文鍵盤、表情鍵盤、PWA 背景恢復與旋轉仍可能改變 Visual Viewport。 | iPhone WebKit 實機必測；不可用 Chromium 模擬宣稱修復完成。 |
| UI-03 | P1 待重構 | `globals.css`, `openwebui.css` | 舊樣式約 48KB／2,192 行與新版樣式約 16KB 並存，行動版多個同名選擇器與大量 `!important`；維護成本高。 | 下一階段移除不再使用的 legacy 規則，建立唯一 Layout tokens / component CSS。 |
| UI-04 | P2 待修 | `Workspace.tsx` | Model modal 有 `role=dialog`，但未完整提供 Esc 關閉、焦點圈限／返回觸發器與鍵盤導航驗收。 | 補上焦點管理、可存取性與 VoiceOver 測試。 |
| PROTO-01 | P1 待修 | `jobs.mjs`, `MessageStream.tsx` | 未支援的 Codex Server Request 僅記錄 warning，未提供對應的人類處理／拒絕路徑，可能讓回合等待。 | 依官方協定區分可答覆／不可答覆事件，對支援種類提供拒絕／取消和逾時機制；不得自動批准。 |
| PROTO-02 | P1 待修 | `jobs.mjs`, `MessageStream.tsx` | 所有 approval 類型共用 `acceptForSession` UI；官方特定 humanCommand 類型只允許單次批准或拒絕。 | 使用 `kind`／`availableDecisions` 驅動可見按鈕，對不同 approval schema 做契約測試。 |
| PROTO-03 | P1 待驗 | `app-server-client.mjs`, `model-registry.mjs` | App Server RPC 參數與可用方法因 Codex CLI 版本而異；模型清單是 catalog，不保證該模型已授權或可以完成推理。 | 對使用者 Ubuntu 安裝版生成 RPC capability matrix，以一次真實 turn 成功驗證模型可用性。 |
| HIST-01 | P1 待修 | `api/threads/route.ts`, `native-appserver.mjs` | 原生 Thread 列表採 App Server 優先，但從列表匯入選取時仍要求舊 JSONL 讀取路徑；若僅有 App Server 資料可能無法載入。 | 統一 Thread 匯入協定，先 `thread/read` 後持久化；保留受限工作區的 JSONL fallback。 |
| HIST-02 | P1 待修 | `native-appserver.mjs` | 清單目前最多讀取 6 頁 × 100；部分歷史讀取 fallback 最多 100 turns，可能造成大型對話缺漏。 | 明確回傳 `hasMore`、真正游標分頁與「資料尚未載完」狀態。 |
| STREAM-01 | P1 待修 | `MessageStream.tsx`, `Workspace.tsx` | Item 雖被收集，畫面仍將 Tools 集中呈現在 Agent 訊息之前，可能與原生事件時間順序不一致；大量 token delta 時全量 reducer 重算也會增加成本。 | 改為 Item-ID 順序的增量投影，保持 chronology；對長工具輸出採虛擬化／分段。 |
| STREAM-02 | P1 待修 | `api/jobs/[id]/events`, `Workspace.tsx` | SSE 在錯誤後會關閉並重讀對話，但部分重連／狀態更新依賴間接 effect，缺少穩定的持續重試與端到端重播驗收。 | 加入網路中斷、切背景與大量事件場景的真實 E2E 測試；監控 SSE cursor。 |
| STATE-01 | P2 待修 | `store.mjs` | 伺服器啟動將 running／queued 標記 interrupted，對 UI 保守，但需要額外確認外部 App Server 工作是否仍在執行。 | 設計恢復／取消對應及孤兒程序清理。 |
| PERF-01 | P1 待驗 | `Workspace.tsx`, `store.mjs` | 同步載入多個 jobs 的事件最多可到約 200,000 筆，再交給 React 渲染；長對話的記憶體與互動延遲風險未做壓測。 | 以視窗化、分頁與增量合併控制記憶體；跑 10k／100k 事件壓測。 |
| PROJ-01 | P2 待修 | `Workspace.tsx`, `api/projects` | UI 保留「新增專案」邏輯，但後端現在固定單一工作區並回 403；這是死掉的操作路徑。 | 移除不可用入口／提示，或明確統一多專案需求（本次不擴增範圍）。 |
| MODEL-01 | P1 待驗 | `model-registry.mjs`, `codex-status.mjs` | 雲端／Qwen 模型使用不同可執行檔；一個 Thread 啟動後鎖定 provider。若切換 provider，後端會拒絕，但前端未先解釋必須建立新對話。 | UI 顯示 route，切換 provider 時提出「開新對話」而非送出後才失敗；驗證相應 CLI 路徑。 |
| OPS-01 | P2 待改善 | `.env.example`, `README.md` | 預設示例含特定 LAN Ollama 位址與 `codex-cloud` binary 名稱；不具普遍可移植性。 | 說明為示例並於安裝時驗證二進位檔與 Model List endpoint。 |
| TEST-01 | P1 待補 | `tests/`, `.github/workflows/ci.yml` | 現有測試多為 Node unit／CSS 契約比對，無真實 Safari PWA、Chrome geometry、Codex CLI Approval E2E。 | 建立真實瀏覽器 bounding-box／鍵盤測試及 Ubuntu App Server 整合測試作為穩定版 Gate。 |

**P0 條件風險** 是部署時的邊界問題，不代表私人 VPN 情境本身存在已證實的漏洞。不能將「沒有網站登入」錯誤描述成單純的安全修復需求，因為這是先前明確決定的架構約束；必須由網路隔離兌現。

## 4. 覆蓋範圍與證據等級

| 驗證 | 本輪結果 | 說明 |
|---|---|---|
| 同步 GitHub `main` | `fccdfff7` | 保留兩路模型路由，合併 PR #3 和設定頁選擇器修正。 |
| Regression RED | 已觀察失敗 | 舊版無單一模型按鈕、布局仍可覆蓋。 |
| Regression GREEN | CI `41564505606`，**69/69 通過** | 最新功能程式碼，0 failed；增加設定頁與正常流 Send 的回歸檢查。 |
| ESLint | 最新 CI pass | `npm run lint` 無阻擋錯誤；建置仍有工具鏈依賴棄用警告。 |
| TypeScript | CI pass | `tsc --noEmit`。 |
| Next.js build | CI pass | 正式建置成功。 |
| GitHub `main` 功能提交 | **`fccdfff7` 已驗證** | 合併後 CI Run `41564505606` 全部通過。 |
| iPhone Safari/PWA | **未執行實機** | 截圖證明舊版失敗，不能反推新版已通過。 |
| Ubuntu 原生 Codex／Qwen | **未執行實機** | 未取得用戶主機 runtime logs，不能聲稱模型切換、批准與 SSE 實際可用。 |
| 安全滲透與負載測試 | **未執行** | 靜態程式碼審查不等於外部攻擊測試。 |

## 5. iPhone／PWA 最小驗收規範

使用與截圖同一台 iPhone、同一個 VPN 存取來源，**實際更新服務與重新打開主畫面 Web App**。逐項檢查：

1. 不開鍵盤，底部僅顯示「模型（整合強度）」「工作區權限」「傳送」三個控制；長模型名稱只截斷模型標籤，不截斷傳送按鈕；兩者 bounding boxes 不得相交。
2. 按模型 → 模型清單 → 選擇有推理強度的模型 → 強度清單 → 返回聊天；沒有強度的模型選完立即關閉選單且強度維持預設。
3. 建立長回答或程式碼輸出的回合，在執行中同時有 Stop 和 Send 時依然不重疊；Stop 不被誤按成 Send。
4. 進入中文注音鍵盤 → 切英文／表情符號 → 關閉鍵盤；輸入區貼近可見螢幕底部但不能遮住頂端狀態列。
5. 左右滑開啟／關閉抽屜；輸入區點擊與水平手勢不得誤觸抽屜。
6. PWA 切入背景後恢復、螢幕旋轉、狹窄裝置與長模型名稱。若失敗，可開啟 `?viewportDebug` 匯出幾何紀錄，不包含 Prompt 內容。

## 6. 優先修復次序

1. **本次 P0 UI 問題：** 減少控制項、正常流傳送鍵、回歸測試（PR #3）。
2. **P1 Codex 真實協定驗證：** approvals schema、完整原生 Session 匯入／恢復。
3. **P1 iPhone WebKit 實機測試：** 鍵盤高度、狀態列、內容視窗與不同字級。
4. **P1 大型對話：** 事件順序、分頁、SSE 斷線、資源上限。
5. **P2 維護清理：** 消除 duplicate CSS、死設定入口、加入 accessibility 和 stable release gate。

## 7. 判定

本輪**可對外聲稱**：修正已在程式碼層將 model/effort 整合成一個二段式按鈕（輸入框與設定頁一致），並把 stop/send 移出絕對定位；已推送至 `main` 且有 69/69 CI 測試通過證據。

本輪**不得聲稱**：完整 Codex App 對等、所有 CLI 版本均支援、iPhone WebKit 已實機驗收、對外網路公開安全、所有審查項目都已修正。

參考協定：`https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md`；`https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/src/protocol/common.rs`。

## 8. 最終整合補充（main：fccdfff7）

- PR #3 合併時底部已是單一模型按鈕，但設定頁仍保留兩個獨立原生下拉選單；`fccdfff7` 已將設定頁統一為相同的模型→推理強度兩階段選單。
- 比對最新 main 和原修正分支，`Workspace.tsx` 只修改設定頁選單區塊；`openwebui.css` 只新增按鈕樣式；另新增兩項回歸測試。未覆蓋先前合併的模型路由與後端修改。
- GitHub Actions Run 41564505606（https://github.com/oMiki0826o/Codex-Workspace-Web/actions/runs/41564505606）：69/69 tests pass、lint pass、TypeScript pass、production build pass。建置期間另有 punycode、url.parse()、ESLint 依賴棄用警告，屬後續升級檢查項。
- 未完成真正的 iPhone Safari PWA 實機、Codex App Server 主機端 E2E、Browser bounding-box 自動測試、安全滲透測試或長對話壓測。CSS 契約檢查不等於實際裝置驗證。
- 接下來需特別測試 320／375／390／414／430 px、執行中 Stop＋Send 同時顯示、中文鍵盤與表情鍵盤、長模型名、工作區權限及 iOS PWA 焦點恢復。

**後續優先順序：** ① 真實 iPhone 驗收；② 真實 App Server 批准協定 E2E；③ 移除重複 CSS 與失效功能入口；④ 事件增量投影和 SSE 重連；⑤ 長對話效能測試。
