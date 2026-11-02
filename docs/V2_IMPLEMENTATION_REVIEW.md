# V2 Redesign: Why and How

This redesign implements the approved Open WebUI-inspired visual direction while keeping the existing Next.js, React, SQLite, SSE, and Codex App Server foundation.

**The former mobile structure failed** because several independently positioned fixed elements, `100dvh` and `visualViewport.height`, and layered override styles could disagree when iOS Safari panned the visual viewport during keyboard focus. A simulated desktop viewport did not reproduce WebKit standalone behavior reliably.

The new implementation keeps `.app` as a flex-column layout with a safe-area top inset, an independently scrolling conversation pane (`min-height:0; flex:1 1 0%`), and a composer that stays in ordinary flex flow. Only a single height CSS variable `--v2-height` changes when a real keyboard is detected. On narrow devices, controls remain horizontally scrollable rather than hidden. Real iPhone WebKit validation is required.

The UI follows Open WebUI's restrained dark-side navigation and search patterns, but the code and styling are independently written, without copying branded resources or violating third-party license terms. Native Codex functionality is driven by native Thread/Turn/Item events and capability discovery, not by decorative buttons.

The planned architecture has components for chat, inspector, approvals and settings; further decomposition of the legacy `Workspace.tsx` into small feature components remains necessary as separate follow-up work. The current release is a **testable preview** rather than a false claim of complete Codex App feature parity.

See `IMPLEMENTATION_STATUS.md` and `docs/TESTING.md` for verified vs pending gates.
