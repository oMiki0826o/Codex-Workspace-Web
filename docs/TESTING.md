# 驗證與發佈檢查

## 可在本機執行的自動檢查

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

- CLI／App Server 參數限制、使用 stdin、明確 thread resume。
- JSONL/UTF-8 分段解碼。
- 目錄 realpath 與 Git Repository 白名單。
- SQLite 專案、對話、Jobs、事件回放與重啟後 interrupted。
- scrypt 密碼與 Origin 比對。
- 使用模擬子程序執行、JSONL 寫入、Thread ID 持久化、錯誤結束處理。
- 工作區範圍的原生 session JSONL 解析、工具事件與 token 用量擷取。

`npm run lint` 執行 ESLint；`npm run typecheck` 執行 TypeScript 無輸出型別檢查；`npm run build` 驗證 Next.js production build。

## 需要在 Ubuntu 與套件安裝完成後驗證

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run start
```

1. 使用與 systemd 相同的普通 Linux 帳號執行 `codex login status`。
2. 將測試 Git 專案加入 `ALLOWED_PROJECT_ROOTS`，開啟網站並新增對話。
3. 發送唯讀 Prompt，檢查 SQLite 與畫面上 JSONL 事件。
4. 第二次發送訊息驗證原生 Codex thread resume 能讀到第一輪上下文。
5. 瀏覽器關閉、VPN 斷線、重開後能回看原 Job。
6. 驗證同一對話不會同時執行兩個回合，並確認全站可並行任務數符合 `CODEX_WEB_MAX_ACTIVE`。
7. 執行中停止，確認其子程序退出並狀態為 cancelled。
8. 驗證異來源 POST 與未核准專案路徑無法觸發 Codex。
9. 用 iPhone Safari 測試側欄、編輯框、分享與鍵盤顯示。
10. 測試 systemd restart 將舊 running Job 標為 interrupted，不會自動重送內容。

## 目前驗證限制

自動檢查不等於真實手機、VPN、systemd 與已登入 Codex 的端到端驗收。發布或對外提供前，仍應在目標 Ubuntu 上執行以上人工檢查，並記錄實際結果。
