#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -eq 0 ]]; then echo '請以執行 Codex CLI 的一般使用者執行，不要使用 sudo。' >&2; exit 1; fi
if ! command -v node >/dev/null; then echo '需要先安裝 Node.js 24 或更新版本' >&2; exit 1; fi
node -e 'if (Number(process.versions.node.split(".")[0])<24)process.exit(1)' || { echo '需要 Node.js >=24' >&2; exit 1; }
command -v codex >/dev/null || echo '注意：目前找不到 codex，請先安裝並登入。'
if [[ ! -f .env ]]; then cp .env.example .env; chmod 600 .env; echo '請先編輯 .env，設定 ALLOWED_PROJECT_ROOTS、DEFAULT_PROJECT_PATH 和 CODEX_WEB_DATA_DIR。'; fi
npm install
npm run build
printf '\n建置完成。先執行 npm run start，然後透過可信 VPN 或內網存取 http://<server-ip>:3000。\n'
printf '確認正常後，依 README 配置 systemd 和 VPN 反向代理。\n'
