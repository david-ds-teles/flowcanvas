---
name: TopBar (48px)
description: Fixed 48px top bar — breadcrumb, ⌘K trigger (static), density/theme/sync cluster.
source:
  path: boards/bl-001-scaffold.md
  anchor: app-shell-7-frame
---
`components/shell/top-bar.tsx` — 48px fixed header. Left: breadcrumb. Right: density toggle, theme toggle, `<SyncStatusDot />`. The ⌘K palette trigger is rendered but non-functional in BL-001 (wired in BL-008).
