# 貢獻指南 / Contributing

## 繁體中文

感謝協作。提交前請先閱讀 `README.md`、`SECURITY.md` 與本專案的測試文件。

1. 不要提交 `.env`、SQLite 資料庫、Codex session、提示內容、日誌、私鑰或本機路徑資料。
2. 保持變更小而聚焦；行為改動需同步更新文件與測試。
3. 在 Node.js 24+ 環境執行：

   ```bash
   npm run test
   npm run lint
   npm run typecheck
   npm run build
   ```

4. Pull request 說明應包含目的、風險、執行過的驗證及尚未驗證的項目。
5. 不要在 issue、commit 或 PR 放入私人對話、Token、VPN 位址、帳號資料或工作區內容。

## English

Thanks for contributing. Read `README.md`, `SECURITY.md`, and the project testing documentation first.

1. Never commit `.env` files, SQLite databases, Codex sessions, prompts, logs, private keys, or local-path data.
2. Keep changes small and focused. Update documentation and tests when behaviour changes.
3. On Node.js 24+, run:

   ```bash
   npm run test
   npm run lint
   npm run typecheck
   npm run build
   ```

4. A pull request must state its purpose, risks, checks run, and anything not verified.
5. Do not put private conversations, tokens, VPN addresses, account data, or workspace contents into issues, commits, or pull requests.
