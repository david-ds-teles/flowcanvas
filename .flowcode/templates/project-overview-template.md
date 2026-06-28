---
name: project-overview
description: Top-level project knowledge base — architecture style, technology stack, modules, conventions, and quality gates.
status: active
tags: [project-overview, architecture, stack, modules]
links: [.flowcode/project/backlog.md, .flowcode/project/project-log.md, .flowcode/quality-checks/quality-checks-index.md]
---

# Project Overview

- {One-paragraph digest: what this project does, for whom, and its primary value.}
- Architecture: {monolith | microservices | monorepo | serverless | hybrid}.
- Primary stack: {language} / {framework} / {database}.
- Modules: {names} — detailed under `modules/{name}.md`.
- Status active; last updated {DATE} by the bootstrap agent.

---

## Project Description

{One paragraph describing what this project does, for whom, and its primary value.}

## Architecture Style

{monolith | microservices | monorepo | serverless | hybrid}

> For microservices: each service has its own file under `.flowcode/project/subprojects/{name}.md`. List them in the Modules table below and link to their files.

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Language | | | |
| Framework | | | |
| Database | | | |
| Cache | | | |
| Message Bus | | | |
| Infrastructure | | | |
| Package Manager | | | |

## Modules / Services

| Module | Path | Purpose | Stack | Detail File |
|--------|------|---------|-------|------------|
| | | | | |

## Folder Structure

```text
{project-root}/
  {folder}/ — {purpose}
  {folder}/ — {purpose}
```

## Dependencies & Integrations

{List external services, APIs, and third-party dependencies that are architecturally significant. For each: name, purpose, how it's used.}

## Code Style & Conventions

{Naming conventions, file organization patterns, coding standards in use. Examples: naming case per language/layer, import order, component structure.}

## Quality Gates

| Gate | Tool | Command | Threshold |
|------|------|---------|-----------|
| Unit tests | | | |
| Linting | | | |
| Type checking | | | |
| Code coverage | | | |
| E2E tests | | | n/a |

## App Run

> _How the `flowcode:browser` harness boots and walks the running app (the visual-parity + smoke checks). Bootstrap fills this for frontend/app projects; delete the section if the project ships no runnable UI. The harness also resolves these live when the section is absent._

- **Dev command:** `{npm run dev}` — referenced from `flowcode-tools.md § Project Tools` (the single command source; do not restate the full command here)
- **Base URL:** `{http://localhost:3000}`
- **Key routes:** `{/ (home), /studio (canvas), /settings}`

> Viewports are **not** listed here — the harness reads them from `{PREFIX}-ui-design.md § Responsive Breakpoints`.

## Environment Variables

> _Optional — delete this section if the project has no environment variables._

| Variable | Purpose | Required | Default |
|----------|---------|---------|---------|
| | | | |

## CI / CD

> _Optional — delete this section if the project has no CI/CD pipeline._

{Describe the CI pipeline: platform, trigger conditions, stages, deployment targets.}

## Evolution Log

| Date | Change |
|------|--------|
| | |
