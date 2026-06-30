---
name: app/globals.css
description: OKLCH token registry — every Direction-A design token as :root/.dark CSS custom properties.
source:
  path: boards/bl-001-scaffold.md
  anchor: theme-system
---
Single source of truth for the token system. Declares every design-system token (palette, type, motion, radius, grain, focus ring) as OKLCH vars in `:root`/`.dark`. Preamble: `@import "tailwindcss"` + `@import "tw-animate-css"` + `@custom-variant dark (&:is(.dark *))`.
