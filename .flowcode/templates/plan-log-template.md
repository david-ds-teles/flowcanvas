---
name: plan-log-template
description: Scaffold and entry formats for a per-plan execution log (.flowcode/plans/{PREFIX}/{PREFIX}-log.md).
status: active
tags: [template, plan-log, execution-log, entries, revise]
links: [.flowcode/templates/templates-index.md, .flowcode/plans/plan-instructions.md, .flowcode/templates/project-log-template.md]
---

# {PREFIX} — {Feature Name} Log

- Per-plan execution record: exactly one per plan at `.flowcode/plans/{PREFIX}/{PREFIX}-log.md`, created from this template when the plan folder is first created.
- Reverse chronological — newest entry at top, directly below the header; updated at every phase end, every revise pass, and at plan end; never deleted.
- Holds four entry formats below: `[PLAN CREATED]` (once), `[PHASE]` (each phase end), `[REVISE]` (each revise pass), `[PLAN COMPLETE]` (once at plan end).
- Every entry opens with `**Dev:**` — the developer who did this work, taken verbatim from the session banner's `Acting as Dev:` line (sourced from git / `FLOWCODE_DEV`); never invented.

---

<!-- entries go here -->

---

## Entry Templates

Use these when appending to this file. New entries go at the **top**, below the file header.

### `[PLAN CREATED]` — first entry, written once

```markdown
## [PLAN CREATED] — {DATE}

**Dev:** {who created this plan — from the session banner's `Acting as Dev:` line}
**Scope:** {one-line objective — matches the plan's Objective section}
**Phases planned:** {N} — {comma-separated phase names}
**Design ref:** `{PREFIX}-design.md`

---
```

### `[PHASE]` — written at the end of every phase

Written immediately after the phase's code-review gate passes. Every field is mandatory. Status reflects the gate outcome.

Status values:
- `complete` — all acceptance criteria met, code-review clean (or warnings only, noted in `Deviations`)
- `complete-with-warnings` — gate passed but reviewer flagged non-blocking issues
- `blocked` — gate failed; phase halted, fix required before continuing

```markdown
## [PHASE {N}] {Phase Name} — {status} — {DATE}

**Dev:** {who executed this phase — from the session banner's `Acting as Dev:` line}
**Started:** {DATE}
**Completed:** {DATE}
**Built:** {one-line summary of what was actually delivered — concrete nouns, not adjectives}
**Files:** {comma-separated list of files created/modified in this phase}
**Gates:** {gate outcomes — e.g. `tsc 0 · build ok · review clean after 1 fix`}
**Deviations:** {every delta between the plan spec and what was built, or "none". If a deviation is lasting, the plan file's spec MUST be updated in the same turn — this field is not a substitute}

---
```

### `[REVISE]` — written at the end of every revise pass

Written after each pass of `flowcode:revise` (see `plan-instructions.md § Revise Stage`). Every field is mandatory; omitting any field is a framework breach.

Context values:
- `post-exec polish` — the plan is `active`, all phases `done` (the revise stage)
- `post-completion amendment` — the plan is `complete` (a closed-plan scoped change)

```markdown
## [REVISE] {short label} — {DATE}

**Dev:** {who did this revise — from the session banner's `Acting as Dev:` line}
**Context:** {`post-exec polish` | `post-completion amendment`}
**Changed:** {one-line — what was fixed/adjusted/amended; concrete nouns}
**Files:** {comma-separated source + artifact files touched this pass}
**Plan/spec amended:** {which plan/design sections were rewritten to match reality, or "none"}
**Gates:** {gate outcomes on the touched scope — e.g. `tsc 0 · build ok · review clean`}

---
```

### `[PLAN COMPLETE]` — written once, at plan end

Written after the post-execution pipeline produces all artifacts and `plan-index.md` flips to `complete`. The same event also produces a `[PLAN COMPLETE]` entry in `.flowcode/project/project-log.md` — that entry is a brief cross-plan view; this one is the plan's own closing record.

```markdown
## [PLAN COMPLETE] — {DATE}

**Dev:** {who closed out this plan — from the session banner's `Acting as Dev:` line}
**Delivered:** {one-line summary of what now exists that did not before}
**Phases:** {N}/{N} — all terminal statuses (`complete` | `complete-with-warnings`)
**Artifacts:** `{PREFIX}-technical-overview.md`, `{PREFIX}-changelog.md`, `{PREFIX}-test-notes.md`, `{PREFIX}-qa-report.md`
**Follow-ups:** {deferred items, known gaps, or "none"}

---
```

---

## Example — filled log

```markdown
## [PLAN COMPLETE] — 2026-04-28

**Dev:** David Teles <david@acme.dev>
**Delivered:** MDView — Next.js markdown viewer/editor with file browser, shiki highlighting, CodeMirror editor
**Phases:** 6/6 — all complete
**Artifacts:** `001-initial-architecture-technical-overview.md`, `001-initial-architecture-changelog.md`, `001-initial-architecture-test-notes.md`, `001-initial-architecture-qa-report.md`
**Follow-ups:** Test runner (vitest) and linter (Biome) not configured — flagged in qa-report

---

## [PHASE 2] Futuristic Black Visual Language — complete — 2026-04-23

**Dev:** Valkyrie <valkyrie@acme.dev>
**Started:** 2026-04-23
**Completed:** 2026-04-23
**Built:** Dark token set (color/typography/motion CSS custom properties), Geist + Geist Mono via `next/font/google`, `.grid-bg` + `.vignette-top-left` body pseudo-element effects, `MDVIEW_` brand mark + status chip landing
**Files:** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
**Gates:** `tsc 0 · build ok · dev 200 · review clean after 2 fixes`
**Deviations:** Vignette uses `::after` since `.grid-bg` owns body `::before`. Plan step 1 updated in the same turn from `::before` to `::after`.

---

## [PHASE 1] Project Bootstrap — complete-with-warnings — 2026-04-23

**Dev:** David Teles <david@acme.dev>
**Started:** 2026-04-23
**Completed:** 2026-04-23
**Built:** Next.js 16.2.4 + React 19.2.4 + Tailwind v4 scaffold serving MDView landing on localhost:3000
**Files:** `package.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/utils.ts`, `.env.local`, `next.config.ts`, `tsconfig.json`
**Gates:** `tsc 0 · build ok · dev 200 · review: 1 critical resolved`
**Deviations:** Tailwind v4 rejects `@import "@tailwindcss/typography"`; plan step 3 updated to `@plugin "@tailwindcss/typography"` in the same turn.

---

## [PLAN CREATED] — 2026-04-23

**Dev:** David Teles <david@acme.dev>
**Scope:** Bootstrap a Next.js 16 app and build MDView incrementally through 6 phases — scaffold → visual language → shell → renderer → editor → file API
**Phases planned:** 6 — Project Bootstrap, Futuristic Black Visual Language, Design System & Shell Layout, Markdown Renderer, Markdown Editor, File Management API & Sidebar
**Design ref:** `001-initial-architecture-design.md`

---
```
