---
name: BL-001 flowui Scaffold
description: System design for the flowui Next.js 15 app scaffold — §7 shell frame, OKLCH token system, shadcn/ui Rhea, Geist fonts.
status: active
tags: [scaffold, nextjs, shell, theme, design]
---

# BL-001 flowui Scaffold

## Runtime Model

Next.js 15 App Router running as a local Node standalone server (`output: 'standalone'`). The browser makes HTTP requests; the server renders the App Shell as React Server Components. No database, no external APIs in BL-001 scope.

The entry point is `app/layout.tsx` — it loads Geist fonts via `next/font`, mounts `ThemeProvider`, and renders `AppShell` with the matched route's page as `{children}`.

## App Shell §7 Frame

The fixed §7 frame is the chrome shared by every view. Static in BL-001 — no live data, no SSE. Live wiring deferred to BL-008.

- **AppShell** (`components/shell/app-shell.tsx`) — composes TopBar + SidebarNav + the Workspace slot.
- **TopBar (48px)** (`components/shell/top-bar.tsx`) — breadcrumb, ⌘K trigger (static), density/theme/sync cluster. Renders SyncStatusDot.
- **SidebarNav (248/52px collapsed)** (`components/shell/sidebar-nav.tsx`) — Board · Graph · Plans · Telemetry · Validation nav with active accent gutter. Item config from `lib/nav.ts`.
- **Workspace Slot** — `{children}` prop of AppShell, renders the matched route page.
- **SyncStatusDot** (`components/shell/sync-status-dot.tsx`) — mono micro-label + colored dot; static `reconnecting` style in BL-001. Type forward-declared for BL-005.

## Theme System

Direction-A OKLCH token system wired in `app/globals.css`:

- Every design token declared as `:root`/`.dark` OKLCH custom property (e.g. `--c-bg: oklch(0.17 0.008 260)`).
- `@theme inline` bindings expose tokens as Tailwind utilities (`bg-bg-app`, `text-text-primary`, `border-border-default`).
- **ThemeProvider** wraps the app via `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`.

## Route Placeholders

Five App Router route segments ship as static empty states in BL-001 — no data, no logic. Views land in BL-009→015.

- `/` — Board (LayoutDashboard icon)
- `/graph` — Graph (Share2 icon)
- `/plans` — Plans (ListChecks icon)
- `/telemetry` — Telemetry (Activity icon)
- `/validation` — Validation (ShieldCheck icon)

## External Dependencies

- **shadcn/ui (Rhea preset)** — dense component primitives; `baseColor: neutral`, `cssVariables: true` (immutable after `shadcn init`).
- **Geist Sans / Geist Mono** — loaded via `next/font` in `app/layout.tsx`; exposed as `--font-geist-sans` / `--font-geist-mono`.
- **Tailwind v4** — CSS-first; `@import "tailwindcss"` + `@tailwindcss/postcss`; no `tailwind.config.js`.
- **next-themes** — class-strategy switch; `defaultTheme="dark"`, `enableSystem={false}`.
