# Codex Workspace Web v2 — Test and Acceptance Contract

## Automated gates (Ubuntu Node.js 24)

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Automated tests cover native item event preservation, explicit permission grants and declines, file change approval previews, steer/interrupt lifecycle, thread read/list workspace boundaries, SSE event serialization, SQLite persistence, and model-specific capability discovery. Layout tests assert **the active imported CSS**, not unused legacy styles.

## Manual Ubuntu Codex integration

Run under the same unprivileged account that runs the website. Start a small Git repository below `ALLOWED_PROJECT_ROOTS`; ensure `DEFAULT_PROJECT_PATH` matches this root. Confirm `codex login status` and `codex app-server --help`.

Verify real `thread/start`, `turn/start`, `thread/resume` (including a conversation created in CLI), `thread/list` paging, `thread/read`, `model/list`, `skills/list`, `mcpServerStatus/list`, a command/file approval declined and approved with visible path and reason, `turn/interrupt` and `turn/steer`. Compare displayed tool output, plan, diff, usage and token counts with live App Server notifications. Confirm unsupported request kinds are not silently approved.

Disconnect network and reconnect SSE; verify event IDs do not duplicate and an uncompleted turn remains visibly running. Restart server to confirm persisted job states are safe.

## Manual iPhone Safari and PWA release gate

Add the site to the iPhone home screen via Safari. Capture before/after screenshots of app launch, focusing the composer and opening the Chinese keyboard, switching to English and emoji, text entry, turning the phone, hiding the keyboard, returning from background, and switching threads. Assert that at least 66px status-bar clearance survives every portrait state, text size does not trigger focus zoom, and the composer stays inside the visible viewport directly above keyboard without overlaying status bar.

Test right swipe for conversation history, left swipe for settings, protected horizontal code scrolling, model/effort/sandbox choices, sidebar vertical scroll that does not move background conversation, and long multiline command and diff output.

For reliable device debugging enable `?viewportDebug`, reproduce once and export the geometry-only JSON from Settings; this avoids guesswork. A passing Chromium simulation alone **must not** be marked Safari accepted.

## Restore previous stable commit

`db174bf5d977610da9bdb14dc44785d4d7c384c5` is the verified initial main baseline. Keep a separate backup of `.env` and `CODEX_WEB_DATA_DIR`, including SQLite, before rolling back. Do not force-push or overwrite changed repository data.
