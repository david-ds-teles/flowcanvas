---
name: AppShell
description: §7 frame composer — assembles TopBar, SidebarNav, and the Workspace slot.
source:
  path: boards/bl-001-scaffold.md
  anchor: app-shell-7-frame
---
`components/shell/app-shell.tsx` — RSC composing the fixed §7 layout: `<TopBar />` + `<SidebarNav />` + `{children}` workspace. Token-driven dimensions: top bar 48px, sidebar 248px (52px collapsed). Props: `{ children: React.ReactNode }`.
