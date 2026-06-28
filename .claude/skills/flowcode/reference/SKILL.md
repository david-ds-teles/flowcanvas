---
name: flowcode:reference
description: Register existing material (design files, specs, diagrams, examples, prototypes) as a reusable reference — store the raw asset under references/{type}/ and write a distilled, indexed reference card a code agent later consults as ground truth. Both ad-hoc via `/flowcode:reference` and as the intake path for any non-documentation reference. Documentation is gathered by `flowcode:docs`, not here.
status: active
tags: [reference, references, material, design, spec, register, index, standalone]
links: [.claude/commands/flowcode/reference.md, .flowcode/references/references-index.md, .flowcode/templates/reference-template.md, .flowcode/quality-checks/markdown-quality.md]
---

# Reference Registration Session

- The operator-facing playbook for turning material the user already has — a design file, spec, diagram, example, or prototype — into a cached, distilled reference a code agent follows; the main agent runs it inline (no sub-agent — one asset, one card, one index row).
- Two surfaces, one engine: standalone via `/flowcode:reference`, and the intake path any phase uses when the user hands over material to keep as a reference.
- **One primitive — the reference card:** every indexed reference is an `.md` card with frontmatter + ≤10-bullet summary that distills the material and links to the stored source asset. `docs` cards are the documentation type (gathered by `flowcode:docs`); this skill writes every other type.
- Stores the raw asset under `references/{type}/{slug}.{ext}` (a non-`.md` asset is hook-exempt) and writes the card beside it at `references/{type}/{slug}.md`.
- Type is `design` | `spec` | `example` | `diagram` | … — inferred from the file and intent; ask only when genuinely ambiguous.
- Existing reference → update mode (`## Update YYYY-MM-DD` append, status re-flip), never overwriting prior content.
- Writes nothing outside `.flowcode/references/`; never fetches from the web; never touches source code.

## When To Use

Use whenever the user gives you material to keep as a reusable reference — "index this", "use this design as the reference", "register this spec". Two ways in:

- **Standalone:** `/flowcode:reference <path> as <type>` — file and card one piece of material on demand.
- **In-phase:** during design/plan/execute, when the user supplies material the work should be built against, register it so the Consult References rule re-surfaces it every time.

Not for: gathering official documentation for a stack technology — that is `flowcode:docs` (the `docs` reference type). Not for ad-hoc "use X or Y?" facts — that is `flowcode:research`.

## Procedure

### 1 — Capture the material

Read `$ARGUMENTS`: a material path and an optional `as <type>`. If empty or the file cannot be located, ask which file/material and its type, and wait. The material may already live under `.flowcode/references/` (the user dropped it there) or anywhere in the repo.

### 2 — Resolve type and slug

- **Type:** infer from the extension and stated intent — `design` (mockups, screenshots, prototypes), `spec` (requirement/spec docs), `example` (reference implementations, sample payloads), `diagram` (architecture/flow diagrams), or another short kebab type when none fits. Honor an explicit `as <type>`. Ask only when genuinely ambiguous.
- **Slug:** kebab of the material's name, unique within `references/{type}/`.

### 3 — Store the asset

- If the asset is **outside** `references/`, copy it to `references/{type}/{slug}.{ext}` so the cache is self-contained.
- If it is **already under** `references/`, leave it in place (note its path).
- Never modify the raw asset.

### 4 — Inspect and distill

Open the material — view an image, read a text/PDF/HTML asset — and extract what it authoritatively defines and how it must drive code work. Distill to the decisions a code agent needs; do not transcribe the whole asset.

### 5 — Write the reference card

Load `.flowcode/templates/reference-template.md` and write `references/{type}/{slug}.md`: frontmatter (`status: current`), a ≤10-bullet summary (what it is, type, source path, consult-when, goes-stale-when), then **What It Is / How to Use It / Source / Update Discipline**. The `Source` row points to the stored asset's relative path.

- **Existing card** → update mode: append a `## Update YYYY-MM-DD` section, re-flip `status:`, never overwrite prior content.

### 6 — Index

Add or update the reference's row in `.flowcode/references/references-index.md` (`Reference | Type | Status | Summary | File`). Keep it to one row per reference.

### 7 — Report

Relay the card path, the type, and the consult condition (when later work should load this reference).

## References

| File | Use |
|------|-----|
| `.claude/commands/flowcode/reference.md` | The thin command surface that invokes this skill |
| `.flowcode/references/references-index.md` | Cache index — add/update the row on completion |
| `.flowcode/references/{type}/{slug}.md` | The reference cards this skill writes; the raw asset sits beside each card |
| `.flowcode/templates/reference-template.md` | Card structure (What It Is → How to Use It → Source → Update Discipline); read before writing |
| `.flowcode/quality-checks/markdown-quality.md` | Markdown rules the card must satisfy |

## Non-Goals

- Do not gather web documentation — that is `flowcode:docs` (the `docs` reference type).
- Do not answer "use X or Y?" decisions or ad-hoc facts — that is `flowcode:research`.
- Do not modify the raw source asset, write outside `.flowcode/references/`, or touch source code.
- Do not transcribe the whole asset — the card is distilled ground truth, not a mirror.
