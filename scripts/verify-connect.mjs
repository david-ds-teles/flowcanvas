#!/usr/bin/env node
// scripts/verify-connect.mjs — live CDP gesture verification of 007 click-to-connect.
//
// Per the standing rule "verify interactions end-to-end": unit tests prove the store; this drives the
// REAL browser with synthetic pointer/key events and asserts the DOM changed for each operator spec —
//   A) drag a connection dot moves it along the border
//   B) hover → click a side dot arms a connection (animated line) → target dots pulse → click lands it
//   C) Esc aborts an armed connection (the cursor line never gets stuck)
// The zustand store isn't on window, so every assertion reads observable DOM (the .fc-rf--connecting
// class, the .fc-connline path, edge count, dot rects). Requires the app running + Chrome.
//   npm run dev   # in another shell
//   node scripts/verify-connect.mjs
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.FLOWCANVAS_BASE_URL ?? 'http://localhost:3000'
const URL = `${BASE}/?path=${encodeURIComponent('examples/commerce-platform.canvas')}`
const PORT = 9356
const SHOT = process.env.SMOKE_SHOT ?? path.join(os.tmpdir(), 'flowcanvas-verify-connect.png')
const CHROME = process.env.CHROME_BIN
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p))

let failures = 0
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const watchdog = setTimeout(() => { console.error('verify-connect: watchdog timeout (90s)'); process.exit(1) }, 90_000)

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  let id = 1
  const pending = new Map(), handlers = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result) }
    else if (m.method) handlers.forEach((h) => h(m))
  })
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
  return { send, handlers, close: () => ws.close() }
}

async function main() {
  if (!CHROME) { console.error('no Chrome found — set CHROME_BIN'); process.exit(2) }
  if (!(await fetch(`${BASE}/api/templates`).then((r) => r.ok).catch(() => false))) { console.error(`app not reachable at ${BASE} — \`npm run dev\``); process.exit(2) }
  const profile = await mkdtemp(path.join(os.tmpdir(), 'fc-verify-'))
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })

  try {
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
    await sleep(2400)

    const evalJs = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result.value
    const mouse = (type, x, y) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseMoved' ? 0 : 1, clickCount: 1 }, sessionId)
    const moveTo = async (x, y) => { await mouse('mouseMoved', x, y); await sleep(40) }
    const tap = async (x, y) => { await mouse('mousePressed', x, y); await sleep(30); await mouse('mouseReleased', x, y); await sleep(120) }
    const press = async (x, y) => { await mouse('mousePressed', x, y); await sleep(30) }   // land/begin fires on press
    const key = async (k, code, vk) => { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }, sessionId); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }, sessionId); await sleep(120) }

    // ── pick two distinct nodes + the centre of each named side handle ──
    const board = await evalJs(`(() => {
      const c = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; };
      const nodes = [...document.querySelectorAll('.react-flow__node')].map(n => ({ id: n.dataset.id, ...c(n) }));
      return { nodes, edges: document.querySelectorAll('.react-flow__edge').length };
    })()`)
    const n1 = board.nodes[0], n2 = board.nodes[1]
    ok(!!n1 && !!n2 && n1.id !== n2.id, `two distinct nodes on the board (${board.nodes.length} nodes, ${board.edges} edges)`)

    // helper: screen centre of a node's named add-handle (revealing it via hover first)
    const addHandle = async (nodeId, side) => {
      await moveTo(...Object.values(board.nodes.find(n => n.id === nodeId)).slice(1))   // hover the node centre to reveal dots
      return evalJs(`(() => { const el = document.querySelector('.react-flow__node[data-id="${nodeId}"] .fc-port-add[data-fc-side="${side}"]'); if(!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) }; })()`)
    }
    const domState = () => evalJs(`(() => ({
      connecting: !!document.querySelector('.react-flow.fc-rf--connecting'),
      hint: !!document.querySelector('.fc-connhint'),
      line: !!document.querySelector('.fc-connline'),
      coreD: (document.querySelector('.fc-connline__core')||{}).getAttribute ? document.querySelector('.fc-connline__core').getAttribute('d') : null,
      tip: !!document.querySelector('.fc-connline__tip'),
      edges: document.querySelectorAll('.react-flow__edge').length,
    }))()`)

    // ════ SPEC B — hover-born side dot · click-to-arm · animated line ════
    await cdp.send('Runtime.evaluate', { expression: `window.__before = document.querySelectorAll('.react-flow__edge').length` }, sessionId)
    const h1 = await addHandle(n1.id, 'right')
    ok(!!h1, `node 1 right "add" handle is present + hittable on hover`)
    await tap(h1.x, h1.y)                                  // click the side dot → arm
    const armed = await domState()
    ok(armed.connecting, 'B1 — clicking a side dot ARMS a connection (.fc-rf--connecting on the canvas)')
    ok(armed.line && armed.hint, 'B2 — the animated connection line + Esc hint appear')

    // move the cursor toward n2 in two steps and confirm the line follows (path d changes)
    const midX = Math.round((h1.x + n2.x) / 2), midY = Math.round((h1.y + n2.y) / 2)
    await moveTo(midX, midY)
    const sA = await domState()
    await moveTo(n2.x, n2.y)
    const sB = await domState()
    ok(sA.coreD && sB.coreD && sA.coreD !== sB.coreD, 'B3 — the line FOLLOWS the cursor (core path d changes as the mouse moves)')
    ok(sB.tip, 'B4 — a glowing cursor tip is drawn')

    // land on n2's left side dot — first hover it DIRECTLY so it reacts (the "about to connect" pulse)
    const h2 = await addHandle(n2.id, 'left')
    await moveTo(h2.x, h2.y)
    const pulse = await evalJs(`(() => {
      const el = document.querySelector('.react-flow__node[data-id="${n2.id}"] .fc-port-add[data-fc-side="left"]');
      if (!el) return null; return getComputedStyle(el).animationName;
    })()`)
    ok(pulse === 'fc-port-pulse', `B5 — a hovered target dot PULSES while armed (animationName=${pulse})`)
    await press(h2.x, h2.y)                                // landing fires on pointerdown
    await mouse('mouseReleased', h2.x, h2.y); await sleep(160)
    const landed = await domState()
    const before = await evalJs(`window.__before`)
    ok(!landed.connecting && !landed.hint, 'B6 — landing DISARMS (class + hint gone)')
    ok(landed.edges === before + 1, `B7 — a new edge was created (${before} → ${landed.edges})`)

    // ════ Esc — abort an armed connection (operator's hard requirement) ════
    await evalJs(`document.querySelector('.fc-edge-input')?.blur(); document.activeElement?.blur?.(); true`)  // drop any open label editor (no stray pointer)
    await sleep(140)
    const edgesNow = (await domState()).edges
    const h3 = await addHandle(n1.id, 'bottom')
    ok(!!h3, `node 1 bottom "add" handle present (re-arm target)`)
    await tap(h3.x, h3.y)
    ok((await domState()).connecting, 'E1 — re-armed a connection for the Esc test')
    await key('Escape', 'Escape', 27)
    const aborted = await domState()
    ok(!aborted.connecting && !aborted.hint && !aborted.line, 'E2 — Esc ABORTS the armed connection (line/hint/class gone)')
    ok(aborted.edges === edgesNow, `E3 — Esc created NO edge (${edgesNow} unchanged)`)

    // ════ SPEC A — drag a connection dot to move it along the border ════
    const dot = await evalJs(`(() => {
      const el = document.querySelector('.react-flow__node[data-id="${n1.id}"] .fc-port[data-fc-portid]');
      if (!el) return null; const r = el.getBoundingClientRect();
      return { id: el.dataset.fcPortid, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
    })()`)
    ok(!!dot, `node 1 has a movable connection dot (port ${dot && dot.id})`)
    if (dot) {
      await moveTo(n1.x, n1.y)                              // hover to reveal
      await mouse('mousePressed', dot.x, dot.y); await sleep(30)
      // drag well past the 4px click/drag threshold, down the node's side
      for (const dy of [12, 28, 48, 70]) { await mouse('mouseMoved', dot.x, dot.y + dy); await sleep(40) }
      await mouse('mouseReleased', dot.x, dot.y + 70); await sleep(160)
      const moved = await evalJs(`(() => {
        const el = document.querySelector('.react-flow__node[data-id="${n1.id}"] [data-fc-portid="${dot.id}"]');
        if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
      })()`)
      ok(moved && Math.hypot(moved.x - dot.x, moved.y - dot.y) > 12, `A1 — dragging the dot MOVED it along the border (Δ=${moved ? Math.round(Math.hypot(moved.x-dot.x, moved.y-dot.y)) : 'n/a'}px)`)
      const stillConnecting = (await domState()).connecting
      ok(!stillConnecting, 'A2 — a dot DRAG does not arm a connection (drag ≠ click)')
    }

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    await writeFile(SHOT, Buffer.from(shot.data, 'base64'))
    console.log(`screenshot: ${SHOT}`)
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    cdp.close()
  } finally {
    chrome.kill()
    await rm(profile, { recursive: true, force: true }).catch(() => {})
  }
}

try { await main() } catch (e) { console.error('verify-connect error:', e); failures++ }
clearTimeout(watchdog)
console.log(failures === 0 ? '\n007 click-to-connect verify: PASS' : `\n007 click-to-connect verify: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
