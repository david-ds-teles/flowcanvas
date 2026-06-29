---
name: flowcode:browser
description: Standalone slash command to drive a real browser against the running app — capture viewports for visual parity, smoke-test load-bearing testids + a clean console for e2e, or both. Resolves a driver via the four-rung ladder so it runs unattended whenever Node is present. Runs the flowcode:browser skill; no plan required.
status: active
tags: [command, browser, capture, smoke, e2e, standalone]
argument-hint: "[capture | smoke | all] [route… | PREFIX=<X>]"
links: [.flowcode/ui/ui-workflow.md, .flowcode/plans/plan-instructions.md]
---

# /flowcode:browser

- Thin entry point: loads and runs the shared `flowcode:browser` skill — the procedure lives in the skill, not here.
- **Standalone, no plan required** — "run the browser test" executes on demand, the App-Run recipe resolved live.
- **Three modes:** `capture` (PNGs for visual parity) · `smoke` (testids + clean console for e2e) · `all`. Default standalone mode is `all`.
- **Honest, never silent:** a missing driver yields a tracked `[deferred]` finding with a repro command, never a skipped check; a real regression / missing testid / console error is a first-class finding.
- Dispatches `flowcode:browser-runner-agent` (sonnet) once over the resolved scope. Report-only — it does not apply fixes.

## Usage

```text
/flowcode:browser                      # all (capture + smoke) against the resolved app
/flowcode:browser capture              # viewport screenshots only (visual parity)
/flowcode:browser smoke                # testid + console assertions only (e2e)
/flowcode:browser smoke /studio /settings   # smoke specific routes
/flowcode:browser capture PREFIX=SDS-2 # bind to a plan: its ui-design viewports + mockup
```

Examples:

- `/flowcode:browser` — boot/attach the app and run both passes.
- `/flowcode:browser capture PREFIX=SDS-2` — capture every breakpoint in `SDS-2`'s ui-design and classify drift against its mockup.
- `/flowcode:browser smoke /checkout` — confirm `/checkout` renders its load-bearing testids with a clean console.

## What This Does

1. Loads the `flowcode:browser` skill and runs its procedure standalone.
2. Resolves the **mode** from `$ARGUMENTS` (default `all`).
3. Resolves the **scope** — a plan `{PREFIX}` (its ui-design viewports + mockup) or standalone routes.
4. Resolves the **App-Run recipe** live: explicit arg → `project-overview.md § App Run` → auto-detect → ask.
5. Dispatches `flowcode:browser-runner-agent` once — it resolves a driver via the ladder (wired MCP → project Playwright → ephemeral Playwright → tracked deferral), boots/attaches, runs the engine, writes PNGs + `result.json`.
6. Routes findings (capture → visual-parity drift; smoke → e2e) and relays a decision-ready verdict.

## Prompt

You are running a standalone browser check on demand.

Run the `flowcode:browser` skill and execute its procedure. Treat `$ARGUMENTS` as: a leading `capture` / `smoke` / `all` token sets the mode (default `all`); a `PREFIX=<X>` token binds to that plan for its ui-design viewports + selected mockup; bare paths are routes to walk. Resolve the App-Run recipe live (explicit → `project-overview.md § App Run` → auto-detect → ask) so the check always runs. Dispatch `flowcode:browser-runner-agent` once over the resolved scope and relay the driver used, captures written, smoke pass/fail, any `≥ medium` regression, and any `[deferred]` finding with its repro command. Do not apply fixes.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not apply fixes or edit source — report-only; hand findings to an implementer.
- Do not silently skip on a missing driver — emit the rung-4 `[deferred]` finding with its repro command.
- Do not register a shell `playwright test` gate — these are agent-orchestrated checks, distinct from the plain Gate Registry.
