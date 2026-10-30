# 實作與驗證狀態 — 2026-10-30

## 已實作

- 真正的 Next.js App Router 頁面（React + 原生 CSS），沒有用 iframe 嵌入舊 HTML。
- 登入、同源驗證、受限 Git 專案註冊與檢視。
- `codex exec --json`、指定 ID resume、UTF-8 JSONL 解碼、SQLite 事件存檔。
- 任務執行管理、停止、同專案鎖定、全站併發限制。
- SSE 事件與歷史讀取、重新連線、深／淺色主題、響應式 UI。
- Ubuntu systemd 範例與 VPN 部署說明。

## 已驗證

- Node 原生測試（CLI 呼叫／SQLite／Auth／Path／模擬 Codex CLI Job）。
- 所有 TypeScript/TSX 檔案語法可以被 TypeScript 轉譯（語法檢查，不代表完整 typecheck）。
- CSS 由 tinycss2 解析沒有頂層語法錯誤。

## 尚未驗證（不是已通過）

- 未在本執行環境安裝 npm 相依：registry DNS 不可解析，`npm install --offline` 也缺少套件快取。
- 因此尚未執行 Next.js build、ESLint、完整 TypeScript 型別檢查與瀏覽器整合測試。
- 尚未連接使用者 Ubuntu 主機與真實 Codex CLI；`resume` 實際旗標與 session 相容性仍需在目標主機驗證。

## 裝置上線前必做

閱讀 `docs/TESTING.md`，在目標 Ubuntu 依序執行 `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test`，並以測試 Git repository 完成手動整合驗收。

## 相對先前 Superpowers 規劃的實作調整

- 使用**原生 CSS** 取代 Tailwind / shadcn/ui，以配合使用者本次明確要求。
- 使用 Node.js 24+ `node:sqlite` 取代 `better-sqlite3`，降低原生模組安裝負擔。
- 保持 Next.js 單程序，不引入 App Server、Redis、Docker 或 Fastify。
- 原設計規劃中的獨立新版本 UI 列表、Git Diff 行級檢視與圖片上傳未加入本版；目前包含唯讀 Git status / diff 統計，作為第一版右側面板。

## 審查方式

本環境未提供可執行的獨立 reviewer subagent，故僅完成作者自我檢查（安全邊界、路徑、CLI 事件、HTML 注入與資料生命週期）。這不等同獨立程式碼審查。
