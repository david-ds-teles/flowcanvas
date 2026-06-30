---
name: Root Layout
description: app/layout.tsx — RSC entry point that loads fonts, mounts ThemeProvider and AppShell.
source:
  path: boards/bl-001-scaffold.md
  anchor: runtime-model
---
`app/layout.tsx` loads Geist Sans/Mono via `next/font`, sets `<html class="dark" lang="en">`, mounts `ThemeProvider`, and renders `AppShell` with `{children}`.
