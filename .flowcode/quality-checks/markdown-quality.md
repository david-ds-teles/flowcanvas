---
name: markdown-quality
description: The rendering contract every flowcode markdown artifact must follow — headings, tables, mermaid, code blocks, lists, links, and finding-as-section format.
status: active
tags: [quality, markdown, rendering, artifacts]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/workflow/flowcode-rules.md, .flowcode/flowcode-index.md]
---

# Markdown Quality

- Rendering rules every flowcode artifact (plan, design, QA report, technical overview, project-overview, changelog, log, research) must follow; load during Tier 2 whenever producing or editing markdown.
- Single `#` title, no skipped heading levels; tables max 3 columns when cells hold code/paths, alignment row required, no block content in cells.
- Mermaid: ASCII arrows only, quote labels containing punctuation, no blank lines inside the block; every fenced block carries a language tag.
- Findings use the finding-as-section format (severity `critical`/`high`/`medium`/`low`/`info`), never a wide findings table.
- Enforcement: `markdown-quality-check.js` (PostToolUse, every flowcode-managed `.md`) — render-breaking defects block (exit 2, must-fix); style issues warn. Treat warnings as real.

---

## Heading Progression

- `#` appears exactly once — the document title.
- No skipping levels. `#` → `##` → `###` → `####`. Never `#` → `###`.
- Under `####` prefer bold labels over `#####` headings — too deep is rarely readable.

## Tables

- **Max 3 columns when any cell holds a path, code identifier, or command.** Wide code-bearing tables wrap badly across renderers. Prefer finding-as-section or a 3-col shape (e.g. `File | Purpose | Load Type`).
- Never put mermaid, code blocks, or multi-line prose inside table cells.
- Alignment row (`|---|`) required on every table — GFM renderers reject tables without it.

## Mermaid

- The first real line (after any `%%` comment or `---…---` config block) must be a recognized diagram type — `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `erDiagram`, `gantt`, `pie`, etc. A block that opens straight into node lines does not render.
- Use ASCII arrows only: `-->`, `-.->`, `==>`. Never Unicode arrows (`→`, `⟶`) — they break most renderers.
- Quote any label that contains `:`, `(`, `)`, `/`, `{`, `}`, `-`, or whitespace. `A["read user-input"] --> B["validate (strict)"]`.
- Keep brackets balanced across the block (`[]`, `()`, `{}`) — an unclosed node bracket breaks parsing.
- No blank lines inside a ```mermaid block — blank lines terminate the diagram in several renderers.
- In `stateDiagram-v2`, never use double colons on edges (`A ::: B`). Use single colon + label: `A --> B: condition`.
- Prefer `flowchart TD` / `flowchart LR` over the legacy `graph` keyword.

## Code Blocks

- Every fenced block carries a language tag: ` ```ts `, ` ```py `, ` ```sh `, ` ```sql `, ` ```yaml `, ` ```json `. Use ` ```text ` only when the content is genuinely non-code.
- No mixed-language blocks. Split.
- No tabs inside code blocks unless the target language requires them (Makefile, Go). Spaces otherwise.

## Lists

- One style per list. Don't mix `-`, `*`, `+` in sibling items.
- Nested list = 2 spaces indent from the parent marker. Not 4, not 1.
- Don't end list items with a period unless the item contains multiple sentences.

## Links

- Inline links for one-off references: `[anchor](url)`.
- Reference-style links for repeated URLs or long lists. Keep the reference block at the bottom of the file.
- Never link to a path that doesn't exist at commit time — broken links inside artifacts corrupt the knowledge graph.

## Status Badges / Inline Labels

- Use bold inline labels, not HTML badges: `**Status:** active`, `**Severity:** high`.
- When listing multiple metadata fields, use a two-column table or a tight bullet list — never a prose run-on.

## Finding-as-Section Format

QA reports, review reports, and any artifact that emits findings uses this shape — **not** a wide findings table:

```markdown
#### Finding 1 — [high] Short descriptive title

**Files:** `src/auth/token.ts:42`, `src/auth/token.ts:110-120`

One-to-three-sentence description of what is wrong or risky and why it matters.

**Suggested fix:** Concrete change — what should be different, not a platitude.

**Resolution:** Filled in by the implementer when addressed, or `deferred — BL-NNN` with the revisit condition.
```

Severity values: `critical`, `high`, `medium`, `low`, `info`.

## Common Breaches (caught by the hook)

| Pattern | Tier | Why |
|---------|------|-----|
| Mermaid Unicode arrow `→` | error | Breaks GitHub / GitLab / Obsidian rendering |
| Mermaid block not starting with a diagram type | error | The diagram does not render at all |
| `stateDiagram` edge using `:::` | error | Mermaid syntax error |
| Unclosed code fence | error | Corrupts the rest of the document |
| 5-col table with code cells | warn | Wraps unreadably; split into finding-as-section |
| Heading jump `#` → `###` | warn | Outlines and TOCs render wrong |
| Fenced block without language tag | warn | No syntax highlight; many linters flag |
| Unquoted mermaid label with `:` | warn | Most mermaid renderers choke silently |

## Authoring Flow

1. Draft the artifact from its template.
2. Before saving, sanity-check this file's rules against the draft.
3. The `markdown-quality-check.js` hook fires on save (PostToolUse, every managed `.md`) — render-breaking defects block until fixed; warnings are real, not optional.
