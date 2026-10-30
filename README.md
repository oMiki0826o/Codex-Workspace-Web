# Codex Workspace Web

[English](README.en.md) · [貢獻指南](CONTRIBUTING.md) · [安全性政策](SECURITY.md)

這是一個**直接操作 Ubuntu 本機 Codex** 的私人網站，提供固定工作區的聊天介面。網站使用 Next.js App Router、React、原生 CSS、Codex App Server、內建 SQLite 與 SSE，**不依賴額外 OpenAI API Key、不要求桌面環境，也不使用 Tailwind**。

> 這是獨立製作的非官方網頁客戶端，不是 OpenAI Codex App。正式工作必須具備已安裝及已登入的 Codex CLI。

## 功能（v1）

- 監聽 `0.0.0.0:3000`，供同一個私人 VPN／可信 LAN 的裝置直接使用；沒有網站密碼或 Cookie 登入流程。
- 固定一個 `DEFAULT_PROJECT_PATH` 工作區；新對話會直接在該目錄執行，可操作其底下的專案。
- 使用 Codex App Server 建立／恢復原生 Codex thread，保留逐項工具事件、Markdown 回覆、取消與 SSE 斷線恢復。
- 只讀取固定工作區之下的原生 Codex sessions；Codex App 與 WebUI 可看同一個對話內容，WebUI 會偵測 session 更新並重新整理。
- 顯示可用模型、推理強度、每個原生對話的 token 用量，以及 Codex 帳號可取得的用量百分比。
- SQLite 只保存 WebUI 的對話清單、工作狀態與事件；服務重啟會把未完成工作標為 `interrupted`，不會自動重跑。
- 預設最多同時兩個任務；同一個對話同時只跑一個任務。
- 深色／淺色原生 CSS、手機抽屜式歷史清單、鍵盤送出、可收起的工作區檔案面板。
- `manifest.webmanifest`、Service Worker 與 standalone display，手機從 VPN HTTPS 網址「加入主畫面」後可像 Web App 開啟。

## 安裝

需 **Ubuntu + Node.js 24+ + npm + Git + 已登入的 Codex CLI**。

```bash
cd codex-webui-nextjs
npm install
cp .env.example .env
nano .env
chmod 600 .env
npm run build
npm run start
```

`.env` 範例：

```dotenv
ALLOWED_PROJECT_ROOTS=/home/your-user/projects,/srv/projects
CODEX_BIN=/home/allen/.npm-global/bin/codex
CODEX_WEB_DATA_DIR=/home/your-user/.local/share/codex-webui
CODEX_WEB_MAX_ACTIVE=2
DEFAULT_PROJECT_PATH=/home/your-user/projects
```

請依照主機實際位置修改，**不要直接使用上述範例路徑**。Next.js 監聽 `0.0.0.0:3000`；手機連上 VPN 後，以主機在該 VPN 的位址加上 `:3000` 開啟。請勿把此埠公開到網際網路。

`DEFAULT_PROJECT_PATH` 設定後，網站會自動使用該固定工作目錄；按「新增對話」即可直接開始，不必先手動新增專案。

先在同一個 Ubuntu 使用者終端確認：

```bash
node --version
codex --version
codex login status
codex app-server --help
```

### 固定工作區

`DEFAULT_PROJECT_PATH` 必須是 `ALLOWED_PROJECT_ROOTS` 之下的既有目錄；它可以是包含多個 Git 專案的容器資料夾。本專案的預設配置是 `/home/allen/4TB/codex-miki-build`；Codex 便能在此目錄及其所有子專案中讀寫。網站只顯示這一個工作區的對話。右側 Git 摘要只會在根目錄本身是 Git repo 時顯示。

### 開機啟動（systemd）

`deploy/codex-webui.service` 是範例，請先將 **User、Group、WorkingDirectory、EnvironmentFile、PATH** 改成主機實際值，讓服務以登入 Codex 的非 root 使用者執行。

```bash
sudo cp deploy/codex-webui.service /etc/systemd/system/codex-webui.service
sudo systemctl daemon-reload
sudo systemctl enable --now codex-webui
sudo systemctl status codex-webui
journalctl -u codex-webui -f
```

服務監聽所有介面；若主機所在 LAN 不是完全可信，請用防火牆只允許 VPN 介面或 VPN 網段的 TCP 3000。不要把此埠轉發到公網，也不要使用 Tailscale Funnel。

### 開發

```bash
npm install
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

`public/ui-preview.html` 是保留前一版**靜態外觀展示**（內含模擬資料），不是正式 Next.js 主介面；實際 Next.js 介面由 `src/components/Workspace.tsx` 與 `src/app/globals.css` 實作，直接連接本機後端 API。

## 注意與限制

- 目前是最小可用版：支援工作區範圍的原生歷史同步；尚未包含完整互動批准、回合中途追加指示或完整 Diff 檢視。
- `workspace-write` 不是主機權限隔離替代品；限制 Node 服務的 Linux 帳號與檔案權限，避免用 root 執行。
- 本站會保存 Prompt、工具事件與可能含有程式碼的執行日誌於 SQLite，請確保資料目錄屬於可信使用者且不要對公網公開。
- 如果 Node 服務重啟，正在執行的任務會標記 `interrupted`，但不自動復原；需先確認專案狀態再下新指令。
- 請在實際 Ubuntu 上用 `codex exec --help` 核對 CLI 版本，尤其 `resume` 旗標相容性。受本地環境限制，未能在使用者的 Ubuntu 及真實 Codex 登入狀態下做端到端實測。
- 對話恢復採保存的原生 thread ID，不使用「最近一個 session」的猜測邏輯。

## 安全檢查

- `spawn(..., {shell:false})`；Prompt 經 stdin，不拼接 shell。
- 已驗證的路徑才可啟動 Codex；只允許 `read-only` 或 `workspace-write`。
- 無任意指令終端；狀態修改需要同源 Origin。
- 使用可信 VPN 的 HTTPS 反向代理；不要公開 Next.js 埠或啟用 Tailscale Funnel。
- 建議定期備份 SQLite，維護 Codex CLI 與 Next.js 更新。

## 技術規格與規劃

`docs/superpowers/` 內保留完整設計文件與實作任務清單。

### Tailscale Serve 快速範例

完成 Tailscale 登入後，Tailscale Serve 可將 HTTPS 請求轉送到本機 loopback `3000` 埠：

```bash
tailscale serve --bg 3000
tailscale serve status
```

只在已授權的私人 Tailnet 裝置瀏覽顯示的 HTTPS 網址，不使用 Funnel 對公網開放。iPhone Safari 開啟該 HTTPS 網址後，選擇「分享 → 加入主畫面」即可用 standalone Web App 開啟。若採 WireGuard 或其他 VPN，請使用僅允許 VPN 來源、提供 HTTPS 的反向代理並正確轉送 Host／Origin 資訊。
