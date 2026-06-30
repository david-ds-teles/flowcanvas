---
name: ThemeProvider
description: next-themes wrapper — enforces .dark class at boot; dark is the default in BL-001.
source:
  path: boards/bl-001-scaffold.md
  anchor: theme-system
---
`components/shell/theme-provider.tsx` — thin `next-themes` wrapper: `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`. Prevents FOUC via boot script. Direction B (light) lands in BL-017.
