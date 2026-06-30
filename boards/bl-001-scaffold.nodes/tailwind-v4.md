---
name: Tailwind v4
description: CSS-first utility framework — @import tailwindcss + @tailwindcss/postcss, no JS config.
source:
  path: boards/bl-001-scaffold.md
  anchor: external-dependencies
---
Tailwind v4 is CSS-first: token system lives in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`). No `tailwind.config.js`. PostCSS: `@tailwindcss/postcss`. Animated utilities via `tw-animate-css`. Key v3→v4 gotcha: ring is 1px, use `bg-(--x)` not `bg-[--x]`.
