---
name: changelog-archive
description: Archived older flowcode changelog entries — versions with no Migration block, below the active window. Split from changelog.md to keep it lean; the migrator never reads this file.
status: active
tags: [changelog, archive, history]
links: [.flowcode/changelog.md]
---

# Changelog Archive

- Older flowcode version entries moved out of `changelog.md` to keep the active changelog lean.
- **Only entries with no `**Migration**` block live here** — every migration-bearing version stays in `changelog.md` so `/flowcode:migrate` always finds the blocks it applies.
- Read-only history for humans; `/flowcode:migrate` and `bundle.js` never read this file.
- Newest archived version on top; see `changelog.md` for the active window and all migration-bearing entries.

---

## Log (archived)

## 0.8.0 — Technology documentation references (`/flowcode:docs`)   ·   2026-06-25

Added:
- **`/flowcode:docs` command + `flowcode:docs` skill + `flowcode:docs-researcher-agent` (sonnet)** — a documentation-reference surface that explores a technology's **official documentation** and distills a token-efficient `references/docs/{tech-slug}.md` a code agent learns from. Cache-first, version-pinned, append-only on revisit. No-arg gathers the whole `project-overview.md` stack with one researcher per technology **in parallel**; `<tech>` gathers one; the consult-every-time rule gathers lazily on first touch.
- **`.flowcode/references/` artifact family** — host-seeded, mirroring `researches/`/`reviews/`: `references-index.md` plus per-technology `docs/{tech-slug}.md` references. New `doc-reference-template.md` (Setup → Core Concepts → Idioms → Anti-Patterns → Project-Relevant API → Version Notes → Sources). `bundle.js` ships `references/` (index only; `docs/*.md` are host-gathered and pruned), `install-lib.js` marks `references/` host-seeded.
- **New `status` class** `current | stale` for `references/docs/{tech-slug}.md` (`file-conventions.md`).

Changed:
- **New "Consult Technology References" rule** (`flowcode-rules.md`) + a **Tier-2 load signal** (`flowcode-workflow.md`): before writing code that uses a stack technology, load its `references/docs/{tech-slug}.md` summary; gather it if missing/stale. This is technology-keyed and persistent — distinct from question-driven `researches/`. The workflow catalog, sub-agent dispatch table, model routing, and parallelism rules register the new agent/skill.

This capability is **dual-surface** (skill + slash command) per the no-agent-discretion-only rule. Bootstrap does **not** auto-gather references (token-efficient by default — lazy on first touch).

Also in this release — **harness-agnostic framework docs**:
- Framework documents no longer hard-code a harness or `agent-tools/` filesystem path (neither resolves in a host install — the installer wires agent-tools into the harness). They reference agent-tools capabilities by their **wired name**: a sub-agent as `flowcode:<name>`, a skill as `flowcode:<name>`, a command as `/flowcode:<name>`; hooks by name. The `file-conventions.md` `links` rule, the `flowcode-index.md` Agent Tools section, and the sub-agent dispatch table were rewritten accordingly.
- New **`harness-leak-check`** PreToolUse hook blocks a harness (`.claude/…`) or non-resolvable `agent-tools/<kind>/` path from landing in a `.flowcode/` framework `.md` doc (excludes the agent-tools tree and `changelog.md`).

All changes are additive — no `**Migration**` block. Checksum convergence installs the new framework files and backfills the host-seeded `references/` directory automatically.

---

## 0.7.0 — Changelog/manifest-driven delta migration   ·   2026-06-25

Changed:
- **`/flowcode:migrate` is now a delta engine, not a per-file sweep.** A new dependency-free `migrate-plan.js` diffs the installed `install-manifest.json` against the framework's shipped `framework-manifest.json` (per-file sha256) and touches **only** the framework files that actually changed/were added/removed — copying them with a script. The old behavior (an LLM sub-agent that hashed and reasoned over *every* shipped file, then swept every host-owned file) was slow and token-heavy; it survives **only** as a `full-convergence` fallback for legacy/pre-baseline installs (no `version`/`sha256` in the manifest, or a source shipping no `framework-manifest.json`).
- **The common upgrade runs with no LLM at all.** The command runs `migrate-plan.js`, and dispatches the `flowcode:migrator-agent` sub-agent **only** when there is judgment work: a host-edited framework file to harvest, or an applied version carrying a `**Migration**` block. Otherwise it copies the changed files, merges hooks, restamps the manifest, and reports — directly.
- **Delta is computed over framework-owned files only** (filtered via `isHostOwned`); the script can never remove or overwrite host work. Host-edited framework files in the delta are harvested as `UC-NNN` before overwrite/removal, as before.

Added:
- **`framework-manifest.json`** — shipped per-version checksum manifest of framework-owned files (installed-path form); the machine source of truth for the delta. Generated + self-checked by `bundle.js`.
- **Auto file-list in every changelog entry** — `bundle.js` writes the `Added/Changed/Removed` block (the `files:auto` markers) from the same manifest diff and fails the build if it and the manifest disagree, so every updated file is recorded here.
- Shared `installedPathFor` / `mergeHookRegistrations` / dev-only set in `install-lib.js`, used by the installer, bundler, and migrator so all three agree on path mapping and hook merging.

All changes are framework-owned (the migrate command/agent, the new manifest, install-engine internals). No host-owned content needs transforming, so there is **no `**Migration**` block** — the delta engine installs the new files and the next migrate restamps the manifest with the new per-file checksums automatically.

---

## 0.6.0 — Standalone code review (`/flowcode:review`)   ·   2026-06-25

Added:
- **`/flowcode:review` command + `flowcode:review` skill** — a standalone, plan-optional code-review surface (the flowcode-native equivalent of `/code-review`). Resolves an arbitrary scope (working tree / staged / ref range / file set), detects an optional plan `{PREFIX}`, and dispatches the existing `flowcode:code-reviewer-agent`. Review-only — applies no fixes.
- **`.flowcode/reviews/` artifact family** — host-seeded, mirroring `researches/`: `reviews-index.md` plus per-run `{slug}-review.md` reports (prepend-only `## Check` sections, finding-as-section). Standalone reports are advisory; plan-bound reviews still write to `{PREFIX}-qa-report.md` where `qa-probe-gate.js` enforces them. New `review-report-template.md`.

Changed:
- **`flowcode:code-reviewer-agent` generalized to three modes** (phase / plan / standalone) with explicit output routing, and **baseline conformance promoted to a first-class finding** — a change that diverges from `project-overview.md`, a `modules/{name}.md` contract, a declared quality gate, or the code conventions is a finding in every mode, even with no plan. `qa-report-template.md` gains a `**Baseline conformance:**` line.
- `artifact-naming-check.js` now enforces `.flowcode/reviews/{slug}-review.md` naming; `bundle.js` ships `reviews/` (index only); `install-lib.js` marks `reviews/` host-seeded.

All changes are additive — no `**Migration**` block. Checksum convergence installs the new files and backfills the host-seeded `reviews/` directory automatically.

---

## 0.5.0 — Local-override cascade (`.local.md`)   ·   2026-06-25

Added:
- **`*.local.md` override convention** — any framework file `X.md` may have a host-authored sibling `X.local.md` in the same directory; the agent loads it as an overlay right after the base (additive; on a direct conflict the `.local` entry supersedes, last-wins). `flowcode-index.md § Local Overrides` defines the load + precedence rule. `*.local.md` is host-owned (`isHostOwned` in `install-lib.js`) — never shipped by upstream, never overwritten on `--force`, preserved on uninstall, preserve-only for the migrator.

Changed:
- **`/flowcode:extend` re-routes host customizations to `.local.md` siblings** — rules / tools / persona / workflow / plan-instructions / git-workflow / ui-* customizations now land in the framework file's `.local.md` sibling instead of being appended into the framework-owned base (which an upgrade refreshes). Host-owned targets (`project/`, `quality-checks/`, `researches/`) are still edited directly. Removes the old "never touch Mandatory Tools — it resets on re-install" hazard.

Why: a host — or a company fork — can now customize behavior without editing any framework file, so upgrades (including a fork's `git merge` of an upstream release) never collide on a shared file.

(Inferable upgrade — no host-owned content needs transforming. The migrator overwrites the framework files that carry the new `§ Local Overrides` rule and the re-routed `extend` command as usual; existing installs have no `*.local.md`, so nothing is stranded. A host's prior in-file customizations to `flowcode-rules.md` / `flowcode-tools.md` / `flowcode-persona.md` surface through the normal harvest — captured as `UC-NNN` before the base file is overwritten — and can be re-added to the relevant `.local.md`. No `**Migration**` block required.)

---

## 0.4.0 — Native Windows support; Node install engine   ·   2026-06-24

Changed:
- **Cross-platform install toolchain** — the installer, uninstaller, bundler, and dev-symlink installer are rewritten from bash into dependency-free Node (`flowcode-install.js`, `flowcode-uninstall.js`, `bundle.js`, `link_project.js`, sharing `install-lib.js` + `install-fs.js`). `node` (≥14) is now the only hard requirement — no more bash / rsync / python3 / shasum. The old `flowcode.sh` / `flowcode-uninstall.sh` / `bundle.sh` / `link_project.sh` are kept as thin launchers, and `.cmd` launchers are added, so the same command runs on Windows, macOS, and Linux.
- **Hooks enforce on Windows** — the four path-gated hooks (`artifact-naming-check`, `frontmatter-summary-check`, `markdown-quality-check`, `project-log-format-check`) now normalize backslash paths before their `.flowcode/`-anchored scope checks, so enforcement no longer silently no-ops on a Windows checkout.
- **Migrator checksum is platform-agnostic** — `migrator-agent` computes `sha256` via a Node one-liner (with `shasum`/`sha256sum` as optional POSIX shortcuts) instead of hard-requiring `shasum`.
- **Cleaner reinstall / uninstall** — `--force` now refreshes framework-owned `.claude/` agent tooling (hooks, commands, skills) as well as `.flowcode/`, so an existing install picks up fixed hooks without a full `/flowcode:migrate`. Uninstall now unmerges flowcode's hook registrations from `.claude/settings.json` (the inverse of the install-time merge), leaving no dangling entries that point at deleted scripts; host-added hooks and settings are untouched.

Added: `.gitattributes` (forces LF on scripts/JS so shebangs survive a Windows checkout; CRLF for `.cmd`/`.bat`); Windows `.cmd` launchers for install / uninstall / link. The bundler rewrites staged `.cmd` to CRLF, since a plain-fs bundle bypasses git's line-ending normalization.

Removed: `install-lib.sh` (superseded by `install-lib.js`; it was dev-only and never installed into `.flowcode/`, so nothing to prune from existing installs).

(Inferable upgrade — no host-owned content needs transforming. The migrator overwrites framework files, including the patched hooks and the renamed install toolchain, as usual; no `**Migration**` block required. Hosts re-pull the framework source to pick up the new install scripts.)

---

## 0.3.0 — Developer attribution, kernel-only bundle, hardened install   ·   2026-06-23

Changed:
- **Developer attribution** — plans and log entries are now attributed to the developer who did the work via the `**Dev:**` field; identity resolves from `FLOWCODE_DEV` env → `git config user.name/email` → `unknown` (`plan-artifact-index.js`). The `/flowcode:contributors` command rolls these up.
- **Kernel-only distribution** — `bundle.sh` builds a kernel-only `dist/` via a top-level allowlist + nested prune + fail-closed self-check; dev-only material (eval workspaces, plan/research instances, install tooling internals) never ships.
- **Single-source ownership** — `install-lib.sh` is the one definition of framework-owned vs host-owned (`FLOWCODE_HOST_OWNED` / `flowcode_is_host_owned`), sourced by `flowcode.sh`, `flowcode-uninstall.sh`, and `link_project.sh`. The installer is hardened (preflight tools, manifest re-install guard, host-owned excludes on `--force`).
- **Per-module bootstrap** — deeper per-module exploration during bootstrap and a standalone `/flowcode:module-doc` surface for module documentation.

Added: search skill, material theme.

(Inferable upgrade — no host-owned content needs transforming. The migrator overwrites framework files and backfills as usual; no `**Migration**` block required.)
