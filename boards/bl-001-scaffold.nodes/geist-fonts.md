---
name: Geist Sans/Mono
description: Local font packages — zero CDN; exposed as --font-geist-sans and --font-geist-mono.
source:
  path: boards/bl-001-scaffold.md
  anchor: external-dependencies
---
`geist` npm package via `next/font/local` in `app/layout.tsx`. Exposes `--font-geist-sans` (UI) and `--font-geist-mono` (code/keys). Bound into Tailwind via `--font-sans: var(--font-geist-sans)` in `@theme inline`.
