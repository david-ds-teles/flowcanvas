---
name: browser-config-schema
description: The browser-config.json (worker → engine input) and result.json (engine → worker output) contracts for the flowcode:browser harness; the wire format capture.mjs reads and writes.
status: active
tags: [browser, schema, contract, capture, smoke]
links: []
---

# Browser Harness Config & Result Schema

- The two JSON shapes that bind `flowcode:browser-runner-agent` (worker) to `capture.mjs` (engine): the worker writes `browser-config.json`, the engine writes `result.json` next to the captures.
- The engine is the executor for ladder rungs 2–3 only; rung 1 (a wired MCP) and rung 4 (deferral) never touch these files — the worker synthesizes the same `result.json` shape itself.
- `mode` selects work: `capture` writes PNGs only, `smoke` asserts testids + console only, `all` does both.
- Capture filenames are exactly `{viewport}-{screen}-{state}.png` — the `ui-mockup-discipline.md § Filename Conventions` shape; no new layout.
- The engine is fail-safe: a single route/viewport/testid failure is recorded in `failures[]` and the run continues; `ok` is `true` only when `failures[]` is empty.
- Exit codes carry the ladder signal: `0` = ran (read `result.json`), `2` = bad config (fix the input), `3` = Playwright unavailable (climb to rung 3, or defer at rung 4).

---

## `browser-config.json` — worker → engine

Written by the worker per run; passed as `node capture.mjs --config <path>`.

```json
{
  "baseUrl": "http://localhost:3000",
  "mode": "all",
  "driver": "playwright-ephemeral",
  "outDir": ".flowcode/plans/SDS-2/mockups/captures/phase-2",
  "timeoutMs": 15000,
  "fullPage": false,
  "viewports": [
    { "name": "desktop-1280", "width": 1280, "height": 800 },
    { "name": "desktop-1440", "width": 1440, "height": 900 }
  ],
  "routes": [
    {
      "path": "/studio",
      "screen": "studio",
      "state": "loaded",
      "waitFor": "[data-testid=studio-canvas]",
      "assertTestids": ["studio-canvas", "node-palette", "inspector-panel"]
    }
  ],
  "assertTestids": ["studio-canvas", "node-palette", "inspector-panel"]
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `baseUrl` | yes | Origin the running app answers on; route paths are appended to it. Trailing slashes are trimmed. |
| `mode` | yes | `capture` / `smoke` / `all`. |
| `driver` | no | Label stamped into `result.json.driver` for traceability (`playwright-ephemeral`, `project-playwright`, …). Defaults to `playwright`. |
| `outDir` | yes | Directory the PNGs and `result.json` are written to. Created if absent. For a plan run, the `captures/phase-{N}/` path; for standalone, a logs path. |
| `timeoutMs` | no | Per-navigation / per-`waitFor` timeout. Defaults to `15000`. |
| `fullPage` | no | `true` → full-scroll-height screenshot; default `false` → viewport-only (the visual-parity default). |
| `viewports[]` | yes | One entry per breakpoint: `{ name, width, height }`. `name` becomes the `{viewport}` filename segment — source it from `{PREFIX}-ui-design.md § Responsive Breakpoints`. |
| `routes[]` | yes | Screens to visit (below). |
| `assertTestids[]` | no | Global smoke testids, used for any route that does not declare its own `assertTestids`. |

### `routes[]` entry

| Field | Required | Meaning |
|-------|----------|---------|
| `path` | yes | Path appended to `baseUrl` (e.g. `/studio`). |
| `screen` | yes | The `{screen}`/`{component}` filename segment (e.g. `studio`). |
| `state` | yes | The `{state}` filename segment (`empty` · `loading` · `loaded`/`success` · `error` · a named edge case). |
| `waitFor` | no | A selector to await after navigation (e.g. `[data-testid=studio-canvas]`); falls back to `networkidle` when absent. |
| `assertTestids[]` | no | Per-route smoke testids; overrides the top-level `assertTestids` for this route (so a testid that only exists on one screen never reports a false miss elsewhere). |

## `result.json` — engine → worker

Written to `{outDir}/result.json`. The worker reads it, classifies, and relays.

```json
{
  "ok": false,
  "driver": "playwright-ephemeral",
  "deferred": false,
  "mode": "all",
  "baseUrl": "http://localhost:3000",
  "captures": [
    { "route": "/studio", "viewport": "desktop-1280", "file": "desktop-1280-studio-loaded.png", "status": "ok" },
    { "route": "/studio", "viewport": "desktop-1440", "file": "desktop-1440-studio-loaded.png", "status": "ok" }
  ],
  "smoke": [
    { "route": "/studio", "testid": "studio-canvas", "present": true },
    { "route": "/studio", "testid": "inspector-panel", "present": false }
  ],
  "consoleErrors": ["TypeError: cannot read 'x' of undefined @ /studio"],
  "failures": ["smoke: inspector-panel missing on /studio", "console: 1 error(s) on /studio"]
}
```

| Field | Meaning |
|-------|---------|
| `ok` | `true` only when `failures[]` is empty. |
| `driver` | Echoes the input `driver` (which ladder rung produced this). |
| `deferred` | `false` from the engine. The worker sets `true` only on a rung-4 deferral (see below). |
| `captures[]` | One row per route × viewport: `file` is relative to `outDir`; `status` is `ok` / `partial` (captured despite a soft nav failure) / `error`. Empty in `smoke` mode. |
| `smoke[]` | One row per route × testid: `{ route, testid, present }`. Viewport-agnostic (asserted once per route). Empty in `capture` mode. |
| `consoleErrors[]` | Console `error` + uncaught page errors collected during the smoke pass, each tagged `… @ {route}`. |
| `failures[]` | Human-readable lines the worker classifies: `smoke: {id} missing on {route}`, `console: {n} error(s) on {route}`, `nav: {url} …`, `capture: {file} …`. |

## Deferral shape (rung 4 — worker-written, no engine run)

When no driver resolves and provisioning is impossible (Node absent), the worker writes a `result.json` of this shape **instead of** running the engine, and routes a tracked `[deferred]` finding — never a silent skip:

```json
{
  "ok": false,
  "deferred": true,
  "driver": "none",
  "reason": "no wired browser MCP, no project e2e driver, and node is unavailable to provision Playwright",
  "repro": "npm install --no-save --prefix .flowcode/logs/browser/.runtime playwright@latest && PLAYWRIGHT_BROWSERS_PATH=.flowcode/logs/browser/.runtime/.pw-browsers .flowcode/logs/browser/.runtime/node_modules/.bin/playwright install chromium && FLOWCODE_PW_RUNTIME=.flowcode/logs/browser/.runtime PLAYWRIGHT_BROWSERS_PATH=.flowcode/logs/browser/.runtime/.pw-browsers node <skill>/references/capture.mjs --config <browser-config.json>"
}
```

`reason` states why every rung above failed; `repro` is the exact command a human / CI runs to produce the missing evidence. The driver-resolution ladder and these commands live in `provisioning.md`.
