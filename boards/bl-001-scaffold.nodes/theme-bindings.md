---
name: "@theme inline"
description: Tailwind v4 utility bridge — maps OKLCH vars to bg-*/text-*/border-* utilities.
source:
  path: boards/bl-001-scaffold.md
  anchor: theme-system
---
The `@theme inline` block in `globals.css` bridges raw OKLCH properties to Tailwind v4 utilities. Each `--color-X: var(--c-X)` line creates a `bg-X` / `text-X` / `border-X` class that responds to `.dark`. E.g. `bg-bg-app`, `text-text-primary`, `border-border-default`, `bg-accent`.
