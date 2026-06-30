---
name: SyncStatusDot (static)
description: Visual sync indicator — static reconnecting style in BL-001; SSE-driven in BL-005.
source:
  path: boards/bl-001-scaffold.md
  anchor: app-shell-7-frame
---
`components/shell/sync-status-dot.tsx` — `state: "connected" | "reconnecting" | "down"`. BL-001 always passes `"reconnecting"` (static placeholder). SSE-driven state update wires in BL-005; type is forward-declared so no breakage.
