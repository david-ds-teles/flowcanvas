---
name: next-themes
description: Class-strategy dark/light switch — enforces .dark at boot without FOUC.
source:
  path: boards/bl-001-scaffold.md
  anchor: external-dependencies
---
`next-themes` v0.4 with `attribute="class"` so Tailwind v4's `@custom-variant dark` responds. `defaultTheme="dark"`, `enableSystem={false}`. Boot script prevents FOUC. Direction B (light) derives from the same `:root` vars in BL-017.
