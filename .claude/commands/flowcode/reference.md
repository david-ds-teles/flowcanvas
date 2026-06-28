---
name: flowcode:reference
description: Standalone slash command to register existing material (design files, specs, diagrams, examples) as a reusable reference — stores the asset under references/{type}/ and writes a distilled reference card, then indexes it. Runs the flowcode:reference skill; no plan required.
status: active
tags: [command, reference, references, material, design, index, standalone]
argument-hint: "[path or description of material] [as <type>]"
links: [.claude/skills/flowcode/reference/SKILL.md, .flowcode/references/references-index.md, .flowcode/templates/reference-template.md]
---

# /flowcode:reference

- Thin entry point: loads and runs the shared `flowcode:reference` skill at `.claude/skills/flowcode/reference/SKILL.md` — the procedure lives in the skill, not here.
- **Standalone, no plan required** — register material you already have so every later phase (and the Consult References rule) can reuse it as ground truth.
- Resolves the material (a path, or a file already dropped under `references/`) and its **type** (`design`, `spec`, `example`, `diagram`, … — infers; asks only if ambiguous).
- Stores the raw asset under `references/{type}/{slug}.{ext}` (leaves it in place if already there) and writes a reference card `references/{type}/{slug}.md` from `reference-template.md`, then adds its row to `references-index.md`.
- **Not** for fetching docs from the web — that is `/flowcode:docs` (the `docs` reference type). This registers material you provide.

## Usage

```text
/flowcode:reference <path> as <type>             # register a file as a typed reference
/flowcode:reference <path>                        # type inferred from the file / asked if unclear
/flowcode:reference                               # no argument — prompt inline for the material + type
```

Examples:

- `/flowcode:reference ./design/login.png as design` — file the mockup under `references/design/` and card it
- `/flowcode:reference ./specs/auth-flow.pdf as spec` — register a spec PDF as a reference
- `/flowcode:reference references/design/dashboard.html` — already dropped under `references/`; just card + index it

## What This Does

1. Loads the `flowcode:reference` skill and runs its procedure standalone.
2. Resolves the material path/description and its type (infers; asks only if ambiguous).
3. Stores the asset under `references/{type}/` (in place if already there).
4. Inspects the material (view image / read text/pdf/html) and writes a distilled reference card.
5. Updates `references-index.md` and relays the card path plus how it will be consulted.

## Prompt

You are running a reference-registration session on demand.

Load `.claude/skills/flowcode/reference/SKILL.md` and execute its procedure. Treat `$ARGUMENTS` as the material to register (a path and optional `as <type>`); if empty, ask which file/material and its type and wait. Store the asset under `.flowcode/references/{type}/`, write a distilled reference card from `.flowcode/templates/reference-template.md`, and update `.flowcode/references/references-index.md`. Never fetch from the web (that is `/flowcode:docs`), never write source code, and write only under `.flowcode/references/`.

## Non-Goals

- Do not fetch or distill web documentation — that is `/flowcode:docs`; this registers material you provide.
- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not answer ad-hoc "use X or Y?" facts — that is `/flowcode:research`.
- Do not write outside `.flowcode/references/`, and never source code.
