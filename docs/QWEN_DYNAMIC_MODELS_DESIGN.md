# Qwen Dynamic Models Design

## Goal

Expose cloud Codex and LAN Ollama/Qwen models through one dynamic WebUI model API, while preserving existing conversations and the current CSS layout exactly.

## Architecture

Add a server-side model registry that reads the existing Codex status source and the LAN adapter's `/v1/models` endpoint. Each model carries its execution route: `native` continues through the App Server, while `qwen` starts the existing Qwen launcher/profile. The existing `Workspace.tsx` model modal consumes this API and renders the returned entries without CSS changes.

## Data contract

`GET /api/models` returns `{ models: [{ id, name, reasoningEfforts, route }] }`, where `route` is `native` or `qwen`. The selected route is persisted with the job so resumed threads keep using the same execution backend.

## Safety

- The Qwen endpoint is server-side only; browsers never receive its LAN address.
- Model discovery has a short timeout and returns native models when Qwen is offline.
- Existing approval and workspace boundaries remain unchanged.
- No CSS, layout, theme, or mobile gesture files may be modified.

## Verification

After all implementation tasks: run the full test suite, TypeScript/lint/build checks, Qwen discovery integration, a native-model regression, and a real Qwen WebUI turn. Restart the WebUI only after these pass; then merge `feature/qwen-dynamic-models` into `main` and push.
