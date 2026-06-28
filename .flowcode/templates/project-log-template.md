---
name: project-log-template
description: Entry formats for the project-level log (.flowcode/project/project-log.md) — [PLAN COMPLETE], [BUGFIX], [BOOTSTRAP], [QUICKFIX], [MIGRATION], [FEEDBACK].
status: active
tags: [template, project-log, entries]
links: [.flowcode/templates/templates-index.md, .flowcode/templates/plan-log-template.md, .flowcode/project/project-log.md]
---

# Project Log Entry Templates

- Entry formats for `.flowcode/project/project-log.md`; new entries always go at the top, below the header line.
- Scope: project-level events only — `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`, `[MIGRATION]`, `[FEEDBACK]`.
- Phase-end `[PHASE]` entries live in the per-plan log, not here — see `plan-log-template.md`.
- Each section below holds one entry format with field rules and a filled example.
- Every entry carries a `**Dev:**` line — the developer who did the work, taken verbatim from the session banner's `Acting as Dev:` line (git / `FLOWCODE_DEV`). The `project-log-format-check.js` hook blocks writes that omit it.

---

## [PLAN COMPLETE] Template

Written at the top of `project-log.md` when the post-execution pipeline finishes and `plan-index.md` flips to `complete`. 3 lines max.

```markdown
## [PLAN COMPLETE] {PREFIX} — {Feature Name} — {DATE}

**Dev:** {who closed out this plan — from the session banner's `Acting as Dev:` line}
**Delivered:** {one-line summary of what now exists that did not before}
**Artifacts:** `{PREFIX}-technical-overview.md`, `{PREFIX}-changelog.md`, `{PREFIX}-test-notes.md`, `{PREFIX}-qa-report.md`
**Follow-ups:** {deferred items, known gaps, or "none"}

---
```

---

## [BUGFIX] Template

3 lines max. Root cause, fix applied, component affected.

```markdown
## [BUGFIX] {Brief title} — {DATE}

**Dev:** {who fixed it — from the session banner's `Acting as Dev:` line}
**Cause:** {root cause — 1 line}
**Fix:** {what was changed — 1 line}
**Affected:** {component, file, or area}

---
```

**Example:**

```markdown
## [BUGFIX] Auth token not refreshed on 401 — 2026-04-22

**Dev:** Valkyrie <valkyrie@acme.dev>
**Cause:** Interceptor was checking `response.status` instead of `error.response.status`
**Fix:** Fixed condition in `src/api/interceptors.ts` — now correctly triggers refresh on 401
**Affected:** All authenticated API calls

---
```

---

## [BOOTSTRAP] Template

Written by the bootstrap agent when `/flowcode:bootstrap` runs or re-runs. Status-first, then what was detected, what was written, what still needs human input.

Status values:
- `success` — every field auto-populated, all target files written
- `partial` — files written but one or more fields are "Not detected — populate manually"
- `needs-attention` — empty project or user input required before proceeding
- `failed` — write error or aborted mid-run

```markdown
## [BOOTSTRAP] {success | partial | needs-attention | failed} — {DATE}

**Dev:** {who ran bootstrap — from the session banner's `Acting as Dev:` line}
**Detected:** {architecture} / {language(s)} / {framework(s)} / {key tools}
**Files:** {created/updated file paths — comma separated, or "none" if aborted}
**Needs manual input:** {field or section — 1 line; "none" if fully populated}
**Next steps:** {1–2 actionable items for the user}

---
```

**Example:**

```markdown
## [BOOTSTRAP] partial — 2026-04-23

**Dev:** David Teles <david@acme.dev>
**Detected:** monolith / TypeScript 5.4 / Next.js 15 / eslint, tsc, vitest
**Files:** `.flowcode/project/project-overview.md`, `.flowcode/quality-checks/quality-checks-index.md`, `.flowcode/workflow/flowcode-tools.md`
**Needs manual input:** Database — no deps or docker-compose found; confirm stack manually
**Next steps:** Fill the Database row in `project-overview.md`; run `/plan` to start first feature

---
```

---

## [QUICKFIX] Template

5 lines max. What changed, why, what it impacts. Reference plan PREFIX if applicable.

```markdown
## [QUICKFIX] {Brief title} — {DATE}

**Dev:** {who made the change — from the session banner's `Acting as Dev:` line}
**Related:** {plan PREFIX (e.g. CMP-234) | standalone}
**What:** {what was changed — 1 line}
**Why:** {reason for the change — 1 line}
**Impact:** {what this affects — 1 line}
**Files:** {list of modified files}

---
```

**Example:**

```markdown
## [QUICKFIX] Increase DB pool size for staging env — 2026-04-22

**Dev:** Valkyrie <valkyrie@acme.dev>
**Related:** standalone
**What:** Changed `DB_POOL_MAX` default from 5 to 20 in `config/database.ts`
**Why:** Staging was hitting connection limits under load testing
**Impact:** Staging environment only; production uses env override
**Files:** `config/database.ts`, `.env.example`

---
```

---

## [MIGRATION] Template

Written by the `flowcode:migrator-agent` agent (`/flowcode:migrate`) when an install is converged to a newer framework version. Counts + follow-ups only — detail lives in the migration report.

```markdown
## [MIGRATION] {from-version} → {to-version} — {DATE}

**Dev:** {who ran the migration — from the session banner's `Acting as Dev:` line}
**Overwritten:** {N} framework files
**Backfilled:** {N} host files (frontmatter/summary/index)
**Harvested:** {N} host edits captured as {UC-NNN ids, or "none"}
**Hooks merged:** {newly registered hooks, or "none"}
**Follow-ups:** {removed/renamed paths needing review, or "none"}

---
```

**Example:**

```markdown
## [MIGRATION] 0.0.0 → 0.1.0 — 2026-06-22

**Dev:** David Teles <david@acme.dev>
**Overwritten:** 41 framework files
**Backfilled:** 6 host files (frontmatter/summary/index)
**Harvested:** 1 host edit captured as UC-007 (custom rule in flowcode-rules.md)
**Hooks merged:** frontmatter-summary-check.js, feedback-nudge.js
**Follow-ups:** none

---
```

---

## [FEEDBACK] Template

Written by the feedback loop (`/flowcode:feedback`) at session wrap-up, recording what session knowledge was captured. Only operator-approved rows are reflected here.

```markdown
## [FEEDBACK] {session label} — {DATE}

**Dev:** {who ran the feedback loop — from the session banner's `Acting as Dev:` line}
**Captured:** {count by category — e.g. 2 decisions, 1 rule, 1 convention, 1 UC}
**Applied:** {target files written/appended, or "none"}
**Logged (not applied):** {decisions/notes recorded but not made binding, or "none"}
**Routed upstream:** {UC-NNN ids, or "none"}
**Rejected/deferred:** {one line, or "none"}

---
```

**Example:**

```markdown
## [FEEDBACK] auth refactor session — 2026-06-22

**Dev:** Valkyrie <valkyrie@acme.dev>
**Captured:** 2 decisions, 1 rule, 1 convention, 1 UC
**Applied:** `quality-checks/error-handling.md` (rule), `quality-checks/naming-conventions.md` (convention)
**Logged (not applied):** deferred rate-limiting to a later plan; noted the JWT lib choice rationale
**Routed upstream:** UC-008
**Rejected/deferred:** none

---
```
