# 安全性政策 / Security Policy

## 繁體中文

此專案會代表執行服務的 Linux 使用者呼叫 Codex，並可讀寫已設定的工作區。因此它只適合私人、可信任的網路。

- 不要公開轉發 TCP 3000，也不要使用公開 Tunnel／Funnel。
- 使用非 root 帳號執行，限制 `.env` 與資料目錄權限。
- 若發現漏洞，請勿公開貼出可利用細節、Prompt、session、Token 或私人路徑；請私下聯絡此部署的維護者。
- 公開倉庫尚未設定集中式漏洞回報管道前，請在建立 issue 前先移除所有敏感內容。

目前不承諾特定版本的支援期限；維護者會依風險與可重現性評估修正。

## English

This project invokes Codex as the Linux account that runs the service and can read/write the configured workspace. It is intended only for private, trusted networks.

- Do not publicly forward TCP port 3000 or use a public tunnel/funnel.
- Run it as a non-root user and restrict access to `.env` and the data directory.
- Do not publish exploit details, prompts, sessions, tokens, or private paths. Report them privately to the maintainer of the deployment.
- Until this public repository has a dedicated reporting channel, remove all sensitive information before opening an issue.

No fixed support window is promised. Fixes are evaluated by severity and reproducibility.
