---
name: {slug}
description: {Type} reference — {one line on what this material is and what it authoritatively defines for the project}.
status: current
tags: [reference, {type}, {slug}]
links: [.flowcode/references/references-index.md]
---

# {Title} Reference

- {What it is + the one-line mental model — e.g. "Approved login redesign mockup: the visual ground truth the implemented screen must match."}
- Type: {type} (design | spec | example | diagram | …). Registered {DATE}. Status {current|stale}.
- Source: `references/{type}/{slug}.{ext}` — {format, e.g. PNG mockup / PDF spec / HTML prototype}.
- Consult when: {the condition that makes this reference relevant — e.g. "implementing or reviewing the login screen"}.
- Goes stale when: {the change that invalidates it — e.g. "the design is superseded or the spec revised"}.

---

## What It Is

{The material, its origin/provenance, and what it authoritatively defines. Distill the essentials a code agent needs to act — do not transcribe the whole asset.}

## How to Use It

{When an agent should consult this reference and how to apply it — decision-ready "match X / follow Y" rules drawn from the material, not a restatement of it.}

## Source

| Asset | Path | Origin |
|-------|------|--------|
| {name} | `references/{type}/{slug}.{ext}` | {user-provided / URL / tool export} |

## Update Discipline (append-only)

Never overwrite prior content on revisit: append a `## Update YYYY-MM-DD` section, flip the top-of-file `status:` (`current` or `stale`), and refresh the `references-index.md` row. Re-store the source asset alongside if a newer version replaces it.

### Example

```markdown
## Update 2026-07-01

**Trigger:** {what changed — e.g. design v2 delivered, spec revised}.

**Changes:**
- {What the new material changes about how a code agent must build against it.}

**Verdict:** {current|stale} — {what to do differently now}.
```
