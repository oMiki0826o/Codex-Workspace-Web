# Codex Workspace Web

[繁體中文](README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

A private, self-hosted browser UI for using the Codex CLI on one fixed Ubuntu workspace. It is an independent, unofficial client, not the OpenAI Codex App.

## What it does

- Binds to `0.0.0.0:3000` for use from a trusted VPN or LAN.
- Runs Codex through the App Server in a configured workspace.
- Shows workspace-scoped native Codex conversations, including changes made in Codex App.
- Streams tool activity and responses, with cancellation and reconnect support.
- Shows available models, reasoning options, token usage, and reported account-usage windows.
- Includes a mobile-first PWA shell for “Add to Home Screen”.

## Requirements

Ubuntu, Node.js 24+, npm, Git, and an installed and signed-in Codex CLI are required. This repository does not need an OpenAI API key.

## Install

```bash
git clone <your-repository-url>
cd Codex-WebUI-NextJS
npm install
cp .env.example .env
chmod 600 .env
# Edit .env with paths that exist on this host.
npm run build
npm run start
```

Set `ALLOWED_PROJECT_ROOTS` and `DEFAULT_PROJECT_PATH` to existing local directories. The default workspace must be inside an allowed root. The WebUI only displays native sessions belonging to that workspace.

On a phone connected to the same trusted VPN, open `http://<vpn-host-address>:3000`. Do not expose port 3000 to the public internet. For PWA installation, place the service behind a trusted HTTPS reverse proxy or VPN HTTPS endpoint, then use the browser’s “Add to Home Screen”.

## Development and verification

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

See [docs/TESTING.md](docs/TESTING.md) for validation scope and manual checks.

## Security notes

This service can read and write files in its configured workspace and may retain prompts and tool output. Run it as a non-root user, protect its data directory, and restrict network access to people you trust. See [SECURITY.md](SECURITY.md).

## License

No license has been selected yet. Until a license is added, reuse, distribution, and contribution terms are not granted.
