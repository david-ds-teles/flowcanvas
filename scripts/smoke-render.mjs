#!/usr/bin/env node
// scripts/smoke-render.mjs — tri-pane render smoke (Phase 7 coverage).
//
// Launches headless Chrome, loads the studio over a running app, and asserts the tri-pane actually
// RENDERS: a non-zero-height canvas (the prime regression suspect), both rails present, React Flow
// nodes + typed-edge labels on the board. This is the check the unit gate cannot do — jsdom has no
// layout, so a 0-height canvas would pass tsc/lint/build/vitest yet ship blank. Exits non-zero on
// failure and writes a screenshot for inspection.
//
// Requires the app running (default http://localhost:3000) + Chrome:
//   npm run dev
//   npm run smoke:render
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.FLOWCANVAS_BASE_URL ?? 'http://localhost:3000'
const URL = `${BASE}/?path=${encodeURIComponent('examples/commerce-platform.canvas')}`
const PORT = 9355
const SHOT = process.env.SMOKE_SHOT ?? path.join(os.tmpdir(), 'flowcanvas-render-smoke.png')
const CHROME = process.env.CHROME_BIN
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))

let failures = 0
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Watchdog: never let a stuck browser hang CI — force-exit non-zero after the cap.
const watchdog = setTimeout(() => { console.error('smoke-render: watchdog timeout (60s)'); process.exit(1) }, 60_000)

// minimal CDP client over the browser websocket
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  let id = 1
  const pending = new Map(), handlers = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id)
      if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result)
    } else if (m.method) handlers.forEach((h) => h(m))
  })
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
  return { send, handlers, close: () => ws.close() }
}

async function main() {
  if (!CHROME) { console.error('no Chrome found — set CHROME_BIN'); process.exit(2) }
  if (!(await fetch(`${BASE}/api/templates`).then((r) => r.ok).catch(() => false))) {
    console.error(`app not reachable at ${BASE} — start it with \`npm run dev\``); process.exit(2)
  }
  const profile = await mkdtemp(path.join(os.tmpdir(), 'fc-smoke-'))
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' })

  try {
    // wait for the debug endpoint
    let ver
    for (let i = 0; i < 40; i++) { try { ver = await fetch(`http://localhost:${PORT}/json/version`).then((r) => r.json()); break } catch { await sleep(150) } }
    if (!ver) throw new Error('Chrome debug endpoint never came up')
    const cdp = await connect(ver.webSocketDebuggerUrl)
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    const loaded = new Promise((res) => cdp.handlers.push((m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res() }))
    await cdp.send('Page.navigate', { url: URL }, sessionId)
    await loaded
    await sleep(2200) // let the client fetch + ReactFlow mount/fitView settle

    const evalJs = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value
    const geom = await evalJs(`(() => {
      const q = s => document.querySelector(s);
      const h = el => el ? Math.round(el.getBoundingClientRect().height) : 0;
      return {
        studio: !!q('.fc-studio'),
        canvasH: h(q('.fc-studio__center .react-flow')),
        rail: !!q('.fc-studio__rail'),
        inspector: !!q('.fc-studio__dock'),   // inspector lives inside the unified right dock
        rfNodes: document.querySelectorAll('.react-flow__node').length,
        edgeLabels: document.querySelectorAll('.fc-edge-label__rel').length,
      };
    })()`)

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    await writeFile(SHOT, Buffer.from(shot.data, 'base64'))

    ok(geom.studio, 'tri-pane shell mounted (.fc-studio)')
    ok(geom.canvasH > 200, `canvas has real height (${geom.canvasH}px > 200) — not the 0-height regression`)
    ok(geom.rail && geom.inspector, 'both rails present (structure rail + right dock)')
    ok(geom.rfNodes >= 5, `React Flow rendered nodes (${geom.rfNodes})`)
    ok(geom.edgeLabels >= 3, `typed-edge rel labels rendered (${geom.edgeLabels})`)
    console.log(`screenshot: ${SHOT}`)
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    cdp.close()
  } finally {
    chrome.kill()
    await rm(profile, { recursive: true, force: true }).catch(() => {})
  }
}

try { await main() } catch (e) { console.error('smoke-render error:', e); failures++ }
clearTimeout(watchdog)
console.log(failures === 0 ? '\nTri-pane render smoke: PASS' : `\nTri-pane render smoke: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
