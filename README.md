# Codex Workspace Web

![Version](https://img.shields.io/badge/version-2.0.0--rc.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tech](https://img.shields.io/badge/stack-Next.js-lightgrey)
![Node.js](https://img.shields.io/badge/node.js-24%2B-brightgreen)

[中文](#中文) | [English](#english)

---

## 中文

### 目錄

- [關於](#關於)
- [功能](#功能)
- [安裝](#安裝)
- [使用方式](#使用方式)
- [授權](#授權)

### 關於

Codex Workspace Web 是供私人 VPN 或受信任 LAN 使用的本機 Codex 網頁介面. 它透過 Next.js App Router, React, Codex App Server, SQLite 與 SSE, 在固定工作區中建立及恢復 Codex 對話.

這是獨立製作的非官方網頁客戶端, 不是 OpenAI Codex App. 正式使用前, 主機必須已安裝並登入 Codex CLI. 本專案不需要額外 OpenAI API Key, 桌面環境或 Tailwind.

### 功能

- 在固定工作區中建立及恢復原生 Codex thread, 顯示 Markdown 回覆與工具事件.
- 將工作狀態及事件保存於 SQLite, 支援取消執行中的工作及 SSE 斷線後重新連線.
- 每一項 App Server 明確要求的檔案或指令操作均由使用者在 WebUI 批准或拒絕.
- 顯示模型, 推理強度, Sandbox 權限, token 用量及可取得的帳號用量資訊.
- Open WebUI 風格固定深色介面、獨立捲動對話列表、右滑開啟歷史／左滑開啟設定，以及支援手機輸入框的安全區域。
- 即時呈現 Codex Tool、Plan、Diff、Token、權限批准等事件，並支援進行中回合追加指示（取決於 CLI 版本）。
- 優先透過 App Server 讀取本機原生對話歷史；版本不支援時保留工作區範圍的 JSONL 唯讀備援。
- 讀取 Skills 與 MCP 伺服器／工具狀態；未支援時明確標示，而非顯示假的按鈕。
- 僅允許設定根目錄下的工作區, 並限制為 `read-only` 或 `workspace-write` Sandbox.

[2.0 介面與協定設計紀錄](./docs/V2_IMPLEMENTATION_REVIEW.md) · [完整測試與裝置驗收](./docs/TESTING.md)

### 安裝

需求: Ubuntu, Node.js 24+, npm, Git 與已登入的 Codex CLI.

```bash
git clone https://github.com/oMiki0826o/Codex-Workspace-Web.git
cd Codex-Workspace-Web
npm ci
cp .env.example .env
nano .env
chmod 600 .env
npm run build
```

請在 `.env` 依主機實際位置設定:

```dotenv
ALLOWED_PROJECT_ROOTS=/home/your-user/projects,/srv/projects
CODEX_BIN=codex
CODEX_CLOUD_BIN=codex-cloud
CODEX_QWEN_BIN=codex
QWEN_OLLAMA_MODELS_URL=http://192.168.1.167:11434/v1/models
CODEX_WEB_DATA_DIR=/home/your-user/.local/share/codex-webui
CODEX_WEB_MAX_ACTIVE=2
DEFAULT_PROJECT_PATH=/home/your-user/projects
```

`CODEX_CLOUD_BIN` 與 `CODEX_QWEN_BIN` 讓同一個 WebUI 依選取模型啟動正確的 App Server。Qwen 清單只由伺服器端向 `QWEN_OLLAMA_MODELS_URL` 動態讀取，模型名稱不寫死、也不會暴露 LAN 端點給瀏覽器。已開始的對話會鎖定模型提供者；要在雲端 Codex 與 Qwen 之間切換，請建立新對話。

### 使用方式

先確認同一個 Ubuntu 使用者可使用 Codex CLI:

```bash
node --version
codex --version
codex login status
codex app-server --help
```

啟動正式伺服器:

```bash
npm run start
```

開發時可使用:

```bash
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

Next.js 會監聽 `0.0.0.0:3000`. 僅能透過私人 VPN 或受信任網路存取, 不要將此埠公開到網際網路, 也不要使用 Tailscale Funnel. 部署前可參考 `deploy/codex-webui.service`, 並將 User, Group, WorkingDirectory, EnvironmentFile 與 PATH 改為主機實際值.

### 授權

本專案採用 MIT 授權, 詳見 [LICENSE](./LICENSE).

---

## English

### Table of Contents

- [About](#about)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

### About

Codex Workspace Web is a local Codex web interface for private VPN or trusted LAN use. It uses Next.js App Router, React, Codex App Server, SQLite, and SSE to create and resume Codex conversations in a fixed workspace.

This is an independently built, unofficial web client and not the OpenAI Codex App. The host must have the Codex CLI installed and authenticated. No additional OpenAI API key, desktop environment, or Tailwind setup is required.

### Features

- Create and resume native Codex threads in a fixed workspace with Markdown responses and tool events.
- Persist job state and events in SQLite, cancel running jobs, and recover the UI through SSE reconnects.
- Require a user decision in the WebUI for every explicit App Server file or command approval request.
- Show model, reasoning effort, Sandbox mode, token usage, and available account usage information.
- Dark-only Open WebUI-inspired interface, independent conversation scrolling, right-swipe history, left-swipe settings, and mobile safe-area controls.
- Native tool, plan, diff, usage, and approval event display, including explicit permission approval and steering for running turns where supported.
- App Server-first native conversation history with restricted JSONL fallback; read-only Skills and MCP status viewers.
- Restrict workspaces to configured roots and support only `read-only` and `workspace-write` Sandbox modes.

[v2 implementation review](./docs/V2_IMPLEMENTATION_REVIEW.md) · [Verification and device acceptance](./docs/TESTING.md)

### Installation

Requirements: Ubuntu, Node.js 24+, npm, Git, and an authenticated Codex CLI.

```bash
git clone https://github.com/oMiki0826o/Codex-Workspace-Web.git
cd Codex-Workspace-Web
npm ci
cp .env.example .env
nano .env
chmod 600 .env
npm run build
```

Configure `.env` for the actual host paths:

```dotenv
ALLOWED_PROJECT_ROOTS=/home/your-user/projects,/srv/projects
CODEX_BIN=codex
CODEX_CLOUD_BIN=codex-cloud
CODEX_QWEN_BIN=codex
QWEN_OLLAMA_MODELS_URL=http://192.168.1.167:11434/v1/models
CODEX_WEB_DATA_DIR=/home/your-user/.local/share/codex-webui
CODEX_WEB_MAX_ACTIVE=2
DEFAULT_PROJECT_PATH=/home/your-user/projects
```

`CODEX_CLOUD_BIN` and `CODEX_QWEN_BIN` select the correct App Server for the selected model in one WebUI. Qwen model discovery occurs server-side from `QWEN_OLLAMA_MODELS_URL`; model names are not hard-coded and the LAN endpoint is not exposed to the browser. A conversation keeps its initial provider; start a new conversation to switch between cloud Codex and Qwen.

### Usage

Confirm that the same Ubuntu user can use the Codex CLI:

```bash
node --version
codex --version
codex login status
codex app-server --help
```

Start the production server:

```bash
npm run start
```

For development:

```bash
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

Next.js listens on `0.0.0.0:3000`. Expose it only through a private VPN or trusted network. Do not expose the port to the public internet or use Tailscale Funnel. Before deployment, adapt `deploy/codex-webui.service` with the host's User, Group, WorkingDirectory, EnvironmentFile, and PATH.

### License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
