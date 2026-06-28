---
name: flowcode:render-html
description: Render a flowcode artifact (a plan's design / plan / technical-overview, or a project architecture/flow view) into a beautiful, self-contained dark-theme HTML deliverable using the house-style template.
status: active
tags: [command, html, deliverable, presentation, render]
argument-hint: "<artifact-path | architecture | flow> [--out <file.html>]"
links: [.flowcode/templates/html-deliverable-template.html, .flowcode/plans/plan-instructions.md, .flowcode/project/project-overview.md, .flowcode/flowcode-index.md]
---

# /flowcode:render-html

- Turns a markdown artifact into a polished, standalone HTML doc in the flowcode house style (dark theme, sticky tabs, cards/pills/drawers/stats/split, lazy Mermaid).
- Self-contained output: only the two CDNs the template uses (Font Awesome, Mermaid); everything else inline — opens anywhere, no build.
- Source can be a path (e.g. `.flowcode/plans/CMP-234/CMP-234-design.md`) or a framework view keyword (`architecture` / `flow`) rendered from `project-overview.md`.
- Default output sits next to the source (`{PREFIX}-{kind}.html` in the plan folder, or `.flowcode/project/{view}.html` for framework views); `--out` overrides.
- Faithful, not creative: it presents the artifact's real content — it never invents facts or restructures the substance.

---

## Usage

```text
/flowcode:render-html .flowcode/plans/CMP-234/CMP-234-design.md
/flowcode:render-html .flowcode/plans/CMP-234/CMP-234-technical-overview.md --out docs/cmp-234.html
/flowcode:render-html architecture          # project architecture view from project-overview.md
/flowcode:render-html flow                   # lifecycle/flow view of the framework or plan
```

---

## What This Does

1. Reads the source artifact (or `project-overview.md` for `architecture`/`flow` views).
2. Reads `.flowcode/templates/html-deliverable-template.html` for the house style.
3. Maps the artifact's sections onto the template's tabs + blocks (mapping below).
4. Writes a single self-contained `.html` to the resolved output path and reports it.

---

## Section → Block Mapping

| Artifact content | House-style block |
|------------------|-------------------|
| Top-level sections / headings | one `<button class="tab">` + matching `<section class="panel">` each |
| Summary metrics, counts, phase progress | `.stats` / `.st` KPI boxes |
| Narrative / context | `.card` with an icon heading |
| Module / component lists | `.modcard` (category accent a/b/c/d) in a `.grid` |
| Mermaid diagrams / architecture | `<pre class="mermaid">` (renders lazily on tab open) |
| Deliberations / rejected-vs-chosen alternatives | `.split` with `.col.bad` / `.col.good` |
| Long detail, appendices | `details.drawer` collapsibles |
| Gates, checklists, acceptance criteria | `ul.clist` with `.ci done/warn/todo` |
| DDL / code / signatures | `<pre><code>` with `.kw` / `.str` / `.cmt` / `.fn` spans |
| Status / model / severity labels | `.pill` / `.tag` |

---

## Prompt

You are rendering a flowcode artifact into the house-style HTML deliverable.

Parse `$ARGUMENTS`: the leading token is the source (a file path, or the keyword `architecture` / `flow`); parse an optional `--out`. Resolve the output path: `--out` if given; else for a plan artifact write `{PREFIX}-{kind}.html` beside it in the plan folder; else for a framework view write `.flowcode/project/{view}.html`.

Read the source artifact in full, then read `.flowcode/templates/html-deliverable-template.html`. Build one `.tab` + `.panel` per top-level section and fill the panels using the Section → Block mapping above, preserving the artifact's real content verbatim where it matters (signatures, DDL, decisions, gate states) — do not invent or restructure substance. Reuse any Mermaid diagrams from the source as-is. Keep the output fully self-contained (inline styles + the template's two CDNs only). Write the file and report its path; do not open a browser.

---

## Non-Goals

- Do not invent content or change the artifact's meaning — this is presentation, not authoring.
- Do not add external CSS/JS beyond the template's two CDNs.
- Do not overwrite the source markdown; only write the new `.html`.
