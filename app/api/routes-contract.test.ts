// Route-contract gate (Phase 7) — imports the App Router handlers and invokes them directly with a
// real NextRequest, asserting each v2 route's happy-path shape + guard. Runs in `vitest run`, so a
// silently-broken route (the gap that let a non-working build pass static gates) now fails the gate.
// fs-mutating cases use a throwaway dir cleaned up in afterAll; read-only cases hit the shipped demo.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

import { GET as canvasGET, POST as canvasPOST } from './canvas/route'
import { GET as templatesGET } from './templates/route'
import { GET as reviewGET, POST as reviewPOST, DELETE as reviewDELETE } from './canvas/review/route'
import { GET as activeGET, POST as activePOST } from './canvas/active/route'
import { GET as bundleGET } from './canvas/bundle/route'
import { GET as fileGET, POST as filePOST, DELETE as fileDELETE } from './file/route'

const ROOT = process.cwd()
const TMP = 'examples/.routes-test-tmp'
const DEMO = 'examples/commerce-platform.canvas'

const get = (url: string) => new NextRequest(new URL(url, 'http://localhost'))
const send = (url: string, method: string, body: unknown) =>
  new NextRequest(new URL(url, 'http://localhost'), {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

// A minimal valid v2 doc for write/review round-trips.
const miniDoc = () => ({
  nodes: [{ id: 'n1', type: 'text', text: 'hi', x: 0, y: 0, width: 100, height: 60 }],
  edges: [],
  flowcanvas: { schemaVersion: '0.2', session: { createdAt: 't', updatedAt: 't', revision: 1 }, comments: [] },
})

beforeAll(async () => { await mkdir(path.join(ROOT, TMP), { recursive: true }) })
afterAll(async () => { await rm(path.join(ROOT, TMP), { recursive: true, force: true }) })

describe('GET /api/templates', () => {
  it('lists the shipped sample templates with valid shape', async () => {
    const res = await templatesGET(get('/api/templates'))
    expect(res.status).toBe(200)
    const { templates } = await res.json()
    const ids = templates.map((t: { id: string }) => t.id).sort()
    expect(ids).toEqual(['tpl-flow', 'tpl-note', 'tpl-service'])
    for (const t of templates) {
      expect(t.kind).toBeTruthy()
      expect(Array.isArray(t.nodes)).toBe(true)
      expect(Array.isArray(t.edges)).toBe(true)
    }
  })
  it('?id resolves one and 404s an unknown id', async () => {
    expect((await templatesGET(get('/api/templates?id=tpl-note'))).status).toBe(200)
    expect((await templatesGET(get('/api/templates?id=nope'))).status).toBe(404)
  })
})

describe('GET /api/canvas', () => {
  it('returns the demo board doc', async () => {
    const res = await canvasGET(get(`/api/canvas?path=${encodeURIComponent(DEMO)}`))
    expect(res.status).toBe(200)
    const { doc } = await res.json()
    expect(doc.flowcanvas.schemaVersion).toBe('0.2')
    expect(doc.nodes.length).toBeGreaterThan(10)
    expect(doc.edges.some((e: { meta?: { rel?: string } }) => e.meta?.rel === 'calls')).toBe(true)
  })
  it('rejects a non-.canvas path (400) and a path escape (400)', async () => {
    expect((await canvasGET(get('/api/canvas?path=README.md'))).status).toBe(400)
    expect((await canvasGET(get('/api/canvas?path=../../etc/passwd'))).status).toBe(400)
  })
  it('404s a missing board', async () => {
    expect((await canvasGET(get('/api/canvas?path=examples/does-not-exist.canvas'))).status).toBe(404)
  })
})

describe('POST /api/canvas — revision bump + bump:false stamp', () => {
  it('bumps the revision by default and persists', async () => {
    const board = `${TMP}/b.canvas`
    const res = await canvasPOST(send('/api/canvas', 'POST', { path: board, doc: miniDoc() }))
    expect(res.status).toBe(200)
    const { revision } = await res.json()
    expect(revision).toBe(2) // 1 -> 2
  })
  it('bump:false leaves the revision unchanged (Phase 7 D3 lastBriefId stamp)', async () => {
    const board = `${TMP}/c.canvas`
    await canvasPOST(send('/api/canvas', 'POST', { path: board, doc: miniDoc() })) // -> rev 2 on disk
    const stamped = miniDoc()
    stamped.flowcanvas.session.revision = 2
    const res = await canvasPOST(send('/api/canvas', 'POST', { path: board, doc: stamped, bump: false }))
    expect((await res.json()).revision).toBe(2) // unchanged
  })
})

describe('review snapshot round-trip', () => {
  it('GET (none) → POST → GET (present) → DELETE → GET (none)', async () => {
    const board = `${TMP}/r.canvas`
    expect((await (await reviewGET(get(`/api/canvas/review?path=${board}`))).json()).review).toBeNull()
    const review = { baseRevision: 5, briefId: 'b1', capturedAt: 't', snapshot: miniDoc(), roundGeneratedFiles: [] }
    expect((await reviewPOST(send('/api/canvas/review', 'POST', { path: board, review }))).status).toBe(200)
    const got = await (await reviewGET(get(`/api/canvas/review?path=${board}`))).json()
    expect(got.review.baseRevision).toBe(5)
    expect((await reviewDELETE(get(`/api/canvas/review?path=${board}`))).status).toBe(200)
    expect((await (await reviewGET(get(`/api/canvas/review?path=${board}`))).json()).review).toBeNull()
  })
  it('rejects an invalid review body (400)', async () => {
    expect((await reviewPOST(send('/api/canvas/review', 'POST', { path: `${TMP}/x.canvas`, review: {} }))).status).toBe(400)
  })
})

describe('active-board pointer round-trip', () => {
  it('POST → GET returns the pointer', async () => {
    expect((await activePOST(send('/api/canvas/active', 'POST', { canvasRef: DEMO, baseRevision: 9, intent: 'test' }))).status).toBe(200)
    const got = await (await activeGET()).json()
    expect(got.canvasRef).toBe(DEMO)
    expect(got.baseRevision).toBe(9)
  })
  it('rejects an invalid pointer (400)', async () => {
    expect((await activePOST(send('/api/canvas/active', 'POST', { intent: 'x' }))).status).toBe(400)
  })
})

describe('GET /api/canvas/bundle', () => {
  it('streams a zip for the demo board', async () => {
    const res = await bundleGET(get(`/api/canvas/bundle?path=${encodeURIComponent(DEMO)}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/zip')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(100)
    expect(bytes[0]).toBe(0x50) // 'P' — zip local-file-header magic 'PK'
    expect(bytes[1]).toBe(0x4b)
  })
})

describe('/api/file GET/POST/DELETE', () => {
  it('reads a demo md and 404s a missing one', async () => {
    const res = await fileGET(get('/api/file?path=examples/commerce-platform/order-service.md'))
    expect(res.status).toBe(200)
    expect((await res.json()).content).toContain('Order Service')
    expect((await fileGET(get('/api/file?path=examples/commerce-platform/nope.md'))).status).toBe(404)
  })
  it('write (.md) → read back → delete; rejects a non-.md write + a path escape', async () => {
    const p = `${TMP}/w.md`
    await mkdir(path.join(ROOT, TMP), { recursive: true })
    expect((await filePOST(send('/api/file', 'POST', { path: p, content: '# hi' }))).status).toBe(200)
    expect((await (await fileGET(get(`/api/file?path=${p}`))).json()).content).toBe('# hi')
    expect((await fileDELETE(get(`/api/file?path=${p}`))).status).toBe(200)
    expect((await filePOST(send('/api/file', 'POST', { path: `${TMP}/x.txt`, content: 'x' }))).status).toBe(400)
    expect((await filePOST(send('/api/file', 'POST', { path: '../escape.md', content: 'x' }))).status).toBe(400)
  })
})
