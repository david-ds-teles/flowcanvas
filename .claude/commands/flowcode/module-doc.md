---
name: flowcode:module-doc
description: (Re)generate one module's deep knowledge-base doc on demand — refresh a stale `.flowcode/project/modules/{name}.md` or backfill a missing one, without a full re-bootstrap. Runs the `flowcode:module-doc` skill (which dispatches `flowcode:module-explorer-agent`).
status: active
tags: [command, module, knowledge-base, refresh]
links: [.flowcode/project/modules/README.md]
---

# /flowcode:module-doc

- Thin entry point: loads and runs the shared `flowcode:module-doc` skill — the procedure lives in the skill (which dispatches `flowcode:module-explorer-agent`), not here.
- Produces one deep, self-contained `modules/{name}.md` per targeted module (real signatures, usage example, module-scoped config/env, traced deps, conventions, insights), in merge-mode.
- Run when a single module's doc is stale or missing (a `flowcode-rules.md §7a` breach) and you don't want a full re-bootstrap.
- Merge-mode: human-authored sections are preserved; code/doc conflicts surface as `> Conflict:` notes.

## Usage

```text
/flowcode:module-doc {module-name | path}
/flowcode:module-doc            # no arg — lists missing/stale module docs and asks which to refresh
```

## What This Does

1. Loads the `flowcode:module-doc` skill and runs its procedure.
2. Resolves the target module(s) against the `project-overview.md` Modules table (or lists missing/stale docs when no arg is given).
3. Dispatches `flowcode:module-explorer-agent` (sonnet) per module — in parallel for independent modules — in merge-mode.
4. Relays each explorer's short report and updates the Modules-table `Purpose` if it changed.

## Prompt

You are (re)generating module knowledge-base docs.

Run the `flowcode:module-doc` skill and execute its procedure. Resolve the requested module(s) — `$ARGUMENTS` if provided, otherwise list missing/stale docs and ask — then dispatch `flowcode:module-explorer-agent` (model **sonnet**) per module in merge-mode and relay the reports.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not re-bootstrap the project — refresh module docs only.
- Do not touch source code or clobber human-authored sections — the explorer runs merge-mode.
