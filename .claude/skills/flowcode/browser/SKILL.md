---
name: flowcode:browser
description: Drive a real browser against the running app — capture every declared viewport for the visual-parity gate, smoke-test that load-bearing testids render and the console is clean for the e2e gate, or both. Resolves a driver via the four-rung ladder (wired MCP → project Playwright → ephemeral Playwright → tracked deferral) so it runs unattended whenever Node is present. Standalone via /flowcode:browser, no plan required; also dispatched by the UI gate + execute pipeline.
status: active
tags: [browser, capture, smoke, visual-parity, e2e, standalone]
links: [.flowcode/ui/ui-workflow.md, .flowcode/plans/plan-instructions.md]
---

# Browser / App Check

- The operator-facing playbook for a browser capture/smoke pass; runs `flowcode:browser-runner-agent` (sonnet) as the worker and owns mode/scope/recipe resolution and finding-routing around it.
- Two surfaces, one engine: standalone via `/flowcode:browser` (no plan needed) and the UI-gate / `flowcode:execute` phase-close dispatch — the same worker, the same `result.json`.
- **Advisory in availability, honest in reporting:** a missing driver never blocks a phase silently — it yields a tracked `[deferred]` finding with a repro command (`provisioning.md` rung 4). A real regression (capture drift `≥ medium`, a missing testid, a console error) is a first-class finding.
- Three modes: `capture` (PNGs for visual parity) · `smoke` (testids + console for e2e) · `all` (both). Standalone default is `all` when a selected mockup exists, smoke-only otherwise.
- Viewports always come from `{PREFIX}-ui-design.md § Responsive Breakpoints` (the single source); the dev command from `flowcode-tools.md § Project Tools`; neither is restated here.
- The capability never edits source — it captures, asserts, routes findings, and relays a verdict; fixes are the implementer's job.

## When To Use

Use whenever you want a real-browser check of the running app — at a UI phase close (visual parity), at an app-touching phase close / post-execution (smoke), or ad-hoc ("run the browser test"). Two ways in:

- **Standalone:** `/flowcode:browser [capture|smoke|all] [route… | PREFIX=<X>]` — anytime, no plan required; the recipe is resolved live.
- **In-framework:** the UI gate (`ui-workflow.md § 3`) dispatches `capture`; the `flowcode:execute` pipeline dispatches `smoke` for app-touching plans — that wiring is owned by those files, not re-implemented here.

Not for: applying fixes (report-only — feed findings to an implementer), pixel-diff math (drift is classified against the mockup, not computed), or registering a project's own `playwright test` as a shell gate (that stays a plain Gate-Registry row that `flowcode:qa-runner-agent` runs).

## Procedure

### 1 — Resolve the mode

From `$ARGUMENTS` (first token `capture` / `smoke` / `all`) or the dispatch context: a UI phase close → `capture`; an app-touching phase close / post-exec → `smoke`. Standalone with no token → `all` (both when a selected mockup exists for the scope; smoke-only otherwise).

### 2 — Resolve the scope

- **Plan-bound** (a `PREFIX=<X>` token, the branch PREFIX, or the active plan): read `{PREFIX}-ui-design.md § Responsive Breakpoints` for the viewports and the selected mockup (its Screens & States give the routes, states, and load-bearing `data-testid`s). Findings land in `{PREFIX}-qa-report.md`. `outDir` is `mockups/captures/phase-{N}/`.
- **Standalone** (no plan): take routes from `$ARGUMENTS` (explicit `route…`) or the recipe's key routes; viewports from the recipe or a sane default. Findings are advisory; `outDir` is a logs path. When several plans plausibly apply, ask rather than guess.

### 3 — Resolve the App-Run recipe (so on-demand always works)

Resolve *how to reach and walk the app* in this order — never stall on a missing recipe:

1. **Explicit** — a base URL / dev command / routes passed in the argument.
2. **`project-overview.md § App Run`** — dev command (by reference to `flowcode-tools.md § Project Tools`), base URL, key routes.
3. **Auto-detect** — `package.json` scripts (`dev` / `start`), the framework's conventional port (Next `:3000`, Vite `:5173`, …), and the routes implied by `{PREFIX}-ui-design.md`.
4. **Ask** the user — only when the above cannot resolve a runnable command + URL.

Viewports are **not** sourced here — they come from `{PREFIX}-ui-design.md § Responsive Breakpoints` (Step 2).

### 4 — Dispatch the worker

Dispatch `flowcode:browser-runner-agent` (sonnet) once, passing the Input Contract it declares: `mode`, `baseUrl`, `devCommand`, `routes`, `viewports`, `assertTestids`, `outDir`, `enginePath` (this skill's `references/capture.mjs`), and `prefix` (or `none`). The worker owns the driver ladder (`provisioning.md`), boot/attach/teardown, the engine run, and `result.json` — do **not** re-implement any of that here. It returns a compact status table, not raw PNGs.

### 5 — Route findings and relay the verdict

From the worker's report + `result.json`:

- **capture** → compare each PNG against the selected mockup and classify drift into the `ui-workflow.md § 3` buckets (Expected → log note; Acceptable → `[low]` finding with `**Resolution:** accepted`; Regression → `[medium]` finding in `{PREFIX}-qa-report.md`, blocks `Phase Status → done`).
- **smoke** → a missing load-bearing testid or a console error is an e2e finding (`[medium]`) in `{PREFIX}-qa-report.md`.
- **deferred (rung 4)** → write a tracked `[deferred]` finding carrying the worker's `repro` command — not a skip; it stays visible until run.

Then relay a decision-ready verdict: the driver used, captures written + their path, smoke pass/fail, any `≥ medium` regression (blocks the gate via `qa-probe-gate.js` when plan-bound), deferrals, and the artifact path. Standalone findings are advisory (no gate).

## References

| File | Use |
|------|-----|
| `flowcode:browser-runner-agent` | The worker — resolves the driver, boots/attaches, runs the engine, writes `result.json`; sonnet |
| `references/provisioning.md` | The four-rung driver ladder + exact ephemeral commands + boot/teardown — the procedure the worker follows |
| `references/browser-config.schema.md` | The `browser-config.json` / `result.json` contract between this skill, the worker, and the engine |
| `references/capture.mjs` | The vendored Playwright engine (rungs 2–3); `enginePath` passed to the worker |
| `.flowcode/ui/ui-workflow.md` | Visual-parity drift buckets + gate that `capture` feeds |
| `.flowcode/ui/ui-mockup-discipline.md` | Capture filename + breakpoint conventions the engine obeys |

## Non-Goals

- Do not apply fixes or edit source — this is report-only; hand findings to an implementer.
- Do not re-implement the driver ladder, boot/teardown, or engine run here — dispatch the worker; this skill resolves mode/scope/recipe and routes findings.
- Do not source viewports or the dev command locally — read them from `{PREFIX}-ui-design.md § Responsive Breakpoints` and `flowcode-tools.md § Project Tools`.
- Do not register a shell `playwright test` gate — that is a plain Gate-Registry row `flowcode:qa-runner-agent` runs; these are agent-orchestrated checks.
- Do not silently skip on a missing driver — emit the rung-4 `[deferred]` finding with its repro command.
