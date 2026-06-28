---
name: file-conventions
description: The frontmatter + summary standard and the Read Depth protocol every flowcode-managed file follows.
status: active
tags: [conventions, frontmatter, summary, read-depth, loading]
links: [.flowcode/workflow/flowcode-workflow.md, .flowcode/workflow/flowcode-rules.md, .flowcode/flowcode-index.md]
---

# File Conventions

- Every flowcode-managed `.md` carries YAML frontmatter (`name, description, status, tags, links`) + a ≤10-line bullet summary directly after its H1.
- `description` (one line) says what the file *is*; the summary (≤10 bullets) says what you need to *act* without reading the body — distinct roles, never duplicated.
- `links` lists related **framework files** in installed-path form (`.flowcode/...`); follow them to navigate instead of re-deriving from the index. Agent-tools capabilities are not files you open by path — reference them by wired name in prose (`flowcode:` skill/sub-agent, `/flowcode:` command, hook name), never in `links`.
- Two orthogonal loading axes: **Load Scope** (eager/context/on-demand — which files, when) and **Read Depth** (index→frontmatter→summary→full — how much of one file).
- Read Depth: read the index, then a candidate's frontmatter, then its summary, then full content — stop as soon as you have enough.
- The frontmatter + summary live at the top of every file precisely so the shallow Read Depth tiers cost few tokens.
- A `PreToolUse` hook (`frontmatter-summary-check.js`) blocks writes of any managed `.md` missing frontmatter or summary.

---

## Frontmatter Schema

Every managed `.md` begins with a YAML frontmatter block delimited by `---`:

```yaml
---
name: <stable-kebab-id>            # usually the filename without .md, or the artifact id (e.g. ABC-design)
description: <one sentence>         # what this file IS — surfaced by the index; NOT the summary
status: <enum>                     # see Status Values
tags: [<kw>, ...]                 # retrieval / grouping keywords (lowercase kebab)
links: [.flowcode/path.md, ...]   # related framework files (.flowcode/…) — the navigation graph
---
```

| Field | Required | Rule |
|-------|----------|------|
| `name` | yes | Stable identifier. For framework files: the filename without `.md`. For plan artifacts: `{PREFIX}-{type}`. Must be unique within its directory. |
| `description` | yes | One sentence, ≤ ~160 chars. What the file is and why it exists. This is the index-facing blurb, **not** a digest of contents. |
| `status` | yes | One value from the file's class (below). |
| `tags` | yes | 1–6 lowercase kebab keywords. May be `[]` only for trivially scoped files, but prefer real tags. |
| `links` | yes | 0+ paths to genuinely related **framework files** in installed-path form (`.flowcode/...`) — these resolve from the project root. Agent-tools capabilities have no harness-agnostic path that resolves in a host, so reference them by wired name in prose, never here. Only list files that exist. May be `[]` when the file truly stands alone. |

**Agent and command files** keep their harness-required keys (`tools`, `model`, command `argument-hint`, `allowed-tools`) as a **superset** alongside the five standard keys — add the standard keys, never remove the required ones.

## Status Values

| File class | Allowed `status` |
|------------|------------------|
| Framework files (workflow, quality-checks, templates, indexes, agents, commands) | `active` \| `deprecated` |
| Project knowledge base (project-overview, modules, backlog, project-log) | `active` |
| Design artifact (`{PREFIX}-design.md`) | `draft` \| `approved` |
| Plan artifact (`{PREFIX}-plan.md`) | `active` \| `paused` \| `complete` |
| Research artifact (`{slug}-research.md`) | `complete` \| `partial` \| `stale` |
| Reference card (`references/{type}/{slug}.md`, incl. `docs/`) | `current` \| `stale` |
| Other generated artifacts (changelog, qa-report, test-notes, technical-overview, log) | `active` \| `complete` |

The frontmatter `status` mirrors the artifact's body status field where one exists; keep them in sync.

## Summary Rule

The **summary** is the content between the H1 (`# Title`) and the first `##` heading:

- 1–10 bullet lines (`- …`), optionally followed by a `---` thematic break; no prose paragraphs and no sub-headings.
- The act-without-reading digest: the key facts, decisions, or contents an agent needs to decide whether to read further or to act directly.
- Decision-ready phrasing — "Use X for Y", not "X and Y exist".
- For **index files**, the summary describes what the directory holds and how to use the table; the table stays file-listing-only.

## The Two Loading Axes

- **Load Scope** — *which files load and when.* Values `eager` / `context` / `on-demand`, declared in each `*-index.md` `Load Type` column. Defined operationally in `flowcode-workflow.md § Read Tier Rules`.
- **Read Depth** — *how much of a chosen file to read.* A reading protocol, **never** an index column.

They compose: Load Scope picks the candidate set; Read Depth controls the per-file token cost.

## Read Depth Protocol

Read in increasing depth and **stop as soon as you have enough**:

1. **Index** — the directory `*-index.md` lists what exists. Start here; never scan the filesystem to discover files.
2. **Frontmatter** — for a candidate, read only the top YAML block (`Read` with a small `limit`, ~12 lines). `description`, `tags`, and `links` often settle relevance or point you elsewhere.
3. **Summary** — if frontmatter is insufficient, read the bullet summary under the H1 (≤10 lines).
4. **Full** — read the whole file only when the summary is genuinely insufficient for the task.

## `links` — The Navigation Graph

`links` makes frontmatter a graph: each file names its neighbours. When a loaded file needs related context, **follow its `links:` paths directly** rather than going back to the index and re-deriving the path. `links` paths use installed-path form (`.flowcode/...`) and point only to framework files, so they resolve from the project root; agent-tools capabilities are referenced by wired name in prose, not via `links`. Keep links reciprocal where it aids navigation, and prune links to files that are renamed or removed.

## Scope — Which Files This Applies To

- **Applies to:** every `.md` under `.flowcode/` and every `.md` in the `agent-tools/` tree — framework files, indexes, and generated artifacts alike.
- **Exempt:** non-markdown files (`*.js` hooks, `settings.json`, `flowcode.yml`, `install-manifest.json`), `templates/agent-instructions.md` (injected verbatim into the host `CLAUDE.md`, so it must not carry YAML frontmatter), and any path outside the managed roots.
- Generated artifacts conform **by construction** because every template in `templates/` scaffolds the frontmatter + summary.

## Enforcement

`frontmatter-summary-check.js` (`PreToolUse`, `Write|Edit|MultiEdit`) blocks any managed-`.md` write that lacks valid frontmatter (all five keys) or a 1–10 bullet summary before the first `##`. Read Depth itself is a discipline taught here, not policed by a hook — the top-of-file layout is what makes the cheap path the easy path.
