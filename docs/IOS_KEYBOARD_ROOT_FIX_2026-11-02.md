# iPhone keyboard and status-bar root cause (2026-11-02)

Baseline: `54a3dcfc47df27d651b7d66156b974830a555bc6`.

## Why prior updates failed
`.app` was in document flow while `.composer-wrap` had independent `position:fixed;top:visualViewport.height;transform:translateY(-100%)`. This mixed layout-viewport fixed coordinates with Safari's visual-viewport pan, explaining the composer jumping under the time/status bar. Padding at the document's top could scroll out of view, so 66px of header safe area disappeared. Main reserved a phantom composer height, increasing gaps.

## Fix
Use ONE fixed `.app` shell, moved by `visualViewport.offsetTop` (relative to layout viewport) when the keyboard is open and resized to `visualViewport.height`. Header, messages, and composer share one flex column. Only the chat scroller scrolls; the composer is `position:relative` and there is no independent top/transform. Reserve at least 66px inside this fixed shell even during keyboard focus. On mobile, call `focus({preventScroll:true})` before Safari's default focus scroll. Blur resets the viewport offset. Drawers and modals are anchored inside the shell.

The right/left swipe actions, dark-only mode, VPN-only operation are unchanged.

## Verification limit
Node unit tests and GitHub Actions verify code and geometry contracts. Chromium mobile emulation cannot prove iOS Safari behavior. Verify real PWA with Chinese input, emoji/keyboard change, blur, resume and rotation. `?viewportDebug` can capture actual WebKit measurements if the issue persists.

Reference: https://github.com/Crscristi28/ios-pwa-keyboard-fix and WebKit visual viewport bug tracker.
