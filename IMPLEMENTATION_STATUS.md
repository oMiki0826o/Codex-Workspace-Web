# Codex Workspace Web 2.0.0-rc.1 — Implementation Status

Updated: 2026-11-02. This document records implemented behavior, **not a promise of iPhone acceptance**.

## Functional work included in this release candidate

- Redesigned dark-only Open WebUI-inspired desktop and mobile experience. Replaced the active legacy `ux-fixes.css` with `src/styles/openwebui.css`; header, message list, and composer occupy one flex shell.
- Mobile right-swipe conversations and left-swipe settings with protected interactive elements and independent scrollable history.
- Native App Server item events, text/output deltas, plans, file differences, usage, approvals and failures are stored in SQLite and replayed over SSE.
- Interactive approval for command execution, file changes (using changes from their associated item) and explicit permission grants. **No automatic approval.** Unknown request methods emit a warning; they are not silently authorized.
- Users can send `turn/steer` instructions while a supported Codex turn is running; Stop uses `turn/interrupt`.
- App Server native thread listing/reading with cwd filtering and read-only JSONL fallback when required.
- Read-only Skills and MCP viewers; Skills can insert the explicit `$skill-name` marker into the prompt. Unsupported methods show a visible explanation rather than pretending to work.
- Default model/effort selectors use server-advertised values. No cloud connection, exposed internet service, or new account login integration added.

## Not established by CI

- **iPhone Safari / standalone PWA keyboard behavior**: true WebKit testing is mandatory before calling the mobile UI fully fixed. Device screenshots from previous revisions demonstrate real regressions; a Chromium rendering is not an acceptance substitute.
- **Real Ubuntu Codex App Server interoperability across CLI releases**, including exact JSON-RPC payloads and approval decisions, needs an authenticated host-side integration run.
- **Complete Codex App feature parity is not present**: structured MCP elicitation forms, experimental tool/requestUserInput, dynamic tool host APIs, cloud tasks, advanced timeline object types, multi-agent coordination controls, and all desktop-only panels are not claimed.
- Some history paths still use synchronous JSONL fallback and legacy sqlite event pagination; for extremely large projects, incremental indexing and memory profiling remain necessary.
- SQL storage does not yet persist all native thread metadata (e.g., pinned or archived thread states). Do not claim complete bidirectional archive/rename synchronization.

## Release gates

On GitHub Actions (Node.js 24): `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Report the exact run SHA and outcome for each candidate.

On Ubuntu: use the same non-root account as the systemd service, verify `codex login status` and `codex app-server`; run sandbox read-only and workspace-write with explicit approval prompts, stop and steer, resume CLI-created sessions, and compare history/changes.

On iPhone: verify keyboard show/hide, Chinese and English input method switch, emoji, device rotation, PWA resumption, top status-bar spacing, both drawers, overflow, and long-code blocks. Use `?viewportDebug` to record only geometry; do not capture user prompt content.
