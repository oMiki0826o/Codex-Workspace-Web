# iPhone Safari keyboard and navigation refresh
Base: `81210f00a2377be8cb9a7d80e80e328f5292c80c`.

## Why previous CSS fixes failed
The prior implementation translated the whole `.app` shell based on `visualViewport.pageTop` while Safari could independently scroll the document when focusing a textarea. The changing viewport height and multiple fixed/absolute transforms could move the composer to the top, overlap the status bar or leave a large empty gap. Chromium geometry simulations alone could not verify iPhone Safari.

## Implemented
- App in normal document flow; only composer aligns to visual viewport height with `top:var(--chat-visible-height)` and `transform:translateY(-100%)`.
- Height-based keyboard state and resize observer reserve transcript space, no full-page translation.
- 16px inputs, 66px portrait top status-bar clearance, permanently dark theme without toggle.
- Swipe right opens conversations, swipe left opens settings; controls, code and system edge gestures are exempt.
- Optional `?viewportDebug=1` to download geometry-only samples via Settings; no prompt text is recorded.

## Verification
Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` on Node 24. Verify real iPhone Safari/PWA focus, keyboard switching and blur before claiming device success.

## References
https://github.com/mattpilott/ios-chat
https://developer.apple.com/forums/thread/800125
https://bugs.webkit.org/show_bug.cgi?id=311821
