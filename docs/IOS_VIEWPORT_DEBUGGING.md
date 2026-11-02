# iOS Safari keyboard layout – root cause and verification
Base commit: `344fb2e2e14f46cde028a8d1767ee87d981b97ac`.

## Root cause
The old code used a fixed app shell and assigned `visualViewport.offsetTop` as its CSS top. On iOS Safari, focusing an input can pan/scroll the document while also shifting the visual viewport; `offsetTop` alone is not the document-space top coordinate. This mix can move the fixed shell above the screen, leave a large gap or overlap the status bar.

## Fix
- Keep HTML and BODY in normal position and use one absolute app frame.
- Anchor frame top to `visualViewport.pageTop`, which includes page scrolling.
- Use `visualViewport.height` while a real keyboard is open; otherwise use `100dvh`.
- Ignore pinch zoom (scale > 1.05); keep all inputs at >= 16px to prevent automatic focus zoom.
- Put messages and composer in normal flex flow; only the message list scrolls.
- Make mobile drawers and modal overlay positioning relative to the app, with a standalone safe-area top fallback.
- Retain existing VPN-only architecture and previously merged changes.

## Verification scope
Node.js unit tests include a keyboard/pageTop regression. Desktop/mobile geometry should be verified with Chromium at 320/390/430px portrait and landscape, including simulated visual viewport pan and keyboard show/hide. **A real iPhone Safari/PWA keyboard run is still required before claiming full device acceptance.**

On Ubuntu rebuild with `npm ci && npm run build`, restart the existing service and fully close/reopen the installed PWA to load fresh assets.
