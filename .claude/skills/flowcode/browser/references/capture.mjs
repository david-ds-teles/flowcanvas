#!/usr/bin/env node
/**
 * capture.mjs — flowcode browser-harness engine (vendored, self-contained).
 *
 * The executor for ladder rungs 2-3 of `flowcode:browser` (project Playwright
 * driver / ephemeral Playwright). Rung 1 (a wired browser MCP) bypasses this
 * file; rung 4 (deferral) is the worker's job. It has NO flowcode coupling —
 * it reads ONE JSON config and emits PNGs + a machine-readable result.json, so
 * the worker can drive it via Bash under any of the supported drivers.
 *
 * USAGE
 *   node capture.mjs --config <path-to-browser-config.json>
 *
 *   Playwright resolution (two rungs share this engine):
 *     - Rung 2 (project driver): a plain `import('playwright')` resolves the
 *       copy in the project's node_modules — ESM walks up from this file's
 *       location, and in a host this file lives under the project tree.
 *     - Rung 3 (ephemeral): the scratch install is NOT an ancestor of this
 *       file, and ESM ignores NODE_PATH, so the worker exports
 *       FLOWCODE_PW_RUNTIME=<prefix> (the dir whose node_modules holds the
 *       freshly-installed playwright); the engine resolves it explicitly via
 *       createRequire. PLAYWRIGHT_BROWSERS_PATH (read by playwright itself)
 *       points the browser binary at the same persistent runtime.
 *
 * CONTRACT — see references/browser-config.schema.md for the full shapes.
 *   Input  (browser-config.json): baseUrl, mode (capture|smoke|all), outDir,
 *     timeoutMs, viewports[], routes[], assertTestids[], optional driver,
 *     fullPage.
 *   Output (result.json, written to outDir): ok, driver, deferred, captures[],
 *     smoke[], consoleErrors[], failures[].
 *
 * FAIL-SAFE — one route/viewport/testid failure never aborts the run: it is
 * recorded as a failure and the loop continues (mirrors qa-runner-agent). The
 * process exits non-zero ONLY when it could not run at all (bad config, or the
 * browser would not launch — the signal the worker uses to climb the ladder).
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Args + config
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') args.config = argv[++i];
    else if (a.startsWith('--config=')) args.config = a.slice('--config='.length);
  }
  return args;
}

function die(code, message) {
  process.stderr.write(`[capture.mjs] ${message}\n`);
  process.exit(code);
}

const { config: configPath } = parseArgs(process.argv.slice(2));
if (!configPath) die(2, 'missing required --config <path>');

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  die(2, `cannot read/parse config "${configPath}": ${err.message}`);
}

const baseUrl = (cfg.baseUrl || '').replace(/\/+$/, '');
const mode = cfg.mode || 'all';
const outDir = cfg.outDir || '.';
const timeoutMs = Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : 15000;
const fullPage = cfg.fullPage === true;
const driver = cfg.driver || 'playwright';
const viewports = Array.isArray(cfg.viewports) ? cfg.viewports : [];
const routes = Array.isArray(cfg.routes) ? cfg.routes : [];
const globalTestids = Array.isArray(cfg.assertTestids) ? cfg.assertTestids : [];

if (!baseUrl) die(2, 'config.baseUrl is required');
if (viewports.length === 0) die(2, 'config.viewports must list at least one viewport');
if (routes.length === 0) die(2, 'config.routes must list at least one route');

const doCapture = mode === 'capture' || mode === 'all';
const doSmoke = mode === 'smoke' || mode === 'all';

const result = {
  ok: false,
  driver,
  deferred: false,
  mode,
  baseUrl,
  captures: [],
  smoke: [],
  consoleErrors: [],
  failures: [],
};

function writeResult() {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    process.stderr.write(`[capture.mjs] could not write result.json: ${err.message}\n`);
  }
}

function testidSelector(id) {
  // Quote the value so ids with special chars stay valid CSS.
  return `[data-testid="${String(id).replace(/"/g, '\\"')}"]`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// A CJS module imported by file URL exposes its exports under `.default`, while
// bare `import('playwright')` also surfaces `chromium` as a named export — take
// whichever is present.
function pickChromium(ns) {
  return ns.chromium || (ns.default && ns.default.chromium);
}

async function loadChromium() {
  // 1. Ambient resolution — works at rung 2 (project node_modules is an
  //    ancestor of this file) and for any global install.
  try {
    const cjs = pickChromium(await import('playwright'));
    if (cjs) return cjs;
    throw new Error('playwright resolved but exposed no chromium');
  } catch (ambientErr) {
    // 2. Explicit runtime — rung 3. FLOWCODE_PW_RUNTIME is the prefix whose
    //    node_modules/ holds the ephemeral install. ESM ignores NODE_PATH, so
    //    resolve via a require rooted in that prefix, then import the file URL.
    const runtime = process.env.FLOWCODE_PW_RUNTIME;
    if (runtime) {
      const req = createRequire(pathToFileURL(path.join(runtime, 'package.json')).href);
      const resolved = req.resolve('playwright');
      const ephem = pickChromium(await import(pathToFileURL(resolved).href));
      if (ephem) return ephem;
    }
    throw ambientErr;
  }
}

let chromium;
try {
  chromium = await loadChromium();
} catch (err) {
  // Playwright not resolvable — the worker reads this to climb to provisioning
  // (rung 3) or, if Node/provisioning is impossible, to emit a rung-4 deferral.
  result.failures.push(`engine: playwright module not available (${err.message})`);
  writeResult();
  die(3, `playwright not installed/resolvable: ${err.message}. Provision it (rung 3) or defer (rung 4).`);
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (err) {
  result.failures.push(`engine: chromium failed to launch (${err.message})`);
  writeResult();
  die(3, `chromium launch failed: ${err.message}. Run "playwright install chromium" then retry.`);
}

try {
  fs.mkdirSync(outDir, { recursive: true });

  for (const vp of viewports) {
    const vpName = vp.name || `${vp.width}x${vp.height}`;
    const width = Number(vp.width) || 1280;
    const height = Number(vp.height) || 800;

    const context = await browser.newContext({ viewport: { width, height } });

    for (const route of routes) {
      const screen = route.screen || 'screen';
      const state = route.state || 'loaded';
      const routePath = route.path || '/';
      const url = baseUrl + (routePath.startsWith('/') ? routePath : '/' + routePath);
      const routeTestids = Array.isArray(route.assertTestids) ? route.assertTestids : globalTestids;

      // Smoke (testid + console assertions) is viewport-agnostic by contract —
      // the result.json `smoke` rows carry no viewport — so it runs once per
      // route, on the first viewport. Console collection is gated the same way
      // so a 2-viewport capture run never double-counts a single page error.
      const isSmokePass = doSmoke && vp === viewports[0];

      const page = await context.newPage();

      if (isSmokePass) {
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            result.consoleErrors.push(`${msg.text()} @ ${routePath}`);
          }
        });
        page.on('pageerror', (err) => {
          result.consoleErrors.push(`${err.message} @ ${routePath}`);
        });
      }

      const consoleBefore = result.consoleErrors.length;
      let navigated = true;

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
        if (route.waitFor) {
          await page.waitForSelector(route.waitFor, { timeout: timeoutMs });
        }
      } catch (err) {
        navigated = false;
        result.failures.push(`nav: ${url} (${vpName}) — ${err.message.split('\n')[0]}`);
      }

      // Capture — screenshot even on a soft nav failure so the drift is visible.
      if (doCapture) {
        const file = `${vpName}-${screen}-${state}.png`;
        try {
          await page.screenshot({ path: path.join(outDir, file), fullPage });
          result.captures.push({ route: routePath, viewport: vpName, file, status: navigated ? 'ok' : 'partial' });
        } catch (err) {
          result.captures.push({ route: routePath, viewport: vpName, file, status: 'error' });
          result.failures.push(`capture: ${file} — ${err.message.split('\n')[0]}`);
        }
      }

      // Smoke — assert each declared testid is present (presence is viewport-
      // agnostic, so this runs only on the smoke pass).
      if (isSmokePass) {
        for (const id of routeTestids) {
          let present = false;
          try {
            present = (await page.locator(testidSelector(id)).count()) > 0;
          } catch (err) {
            result.failures.push(`smoke: selector error for "${id}" on ${routePath} — ${err.message.split('\n')[0]}`);
          }
          result.smoke.push({ route: routePath, testid: id, present });
          if (!present) result.failures.push(`smoke: ${id} missing on ${routePath}`);
        }

        const newErrors = result.consoleErrors.length - consoleBefore;
        if (newErrors > 0) {
          result.failures.push(`console: ${newErrors} error(s) on ${routePath}`);
        }
      }

      await page.close();
    }

    await context.close();
  }
} catch (err) {
  result.failures.push(`engine: unexpected error — ${err.message.split('\n')[0]}`);
} finally {
  await browser.close().catch(() => {});
}

result.ok = result.failures.length === 0;
writeResult();

// Exit 0 even with recorded failures — failures are data the worker classifies,
// not a crash. The non-zero exits above are the only "could not run" signals.
process.exit(0);
