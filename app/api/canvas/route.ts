import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'
import type { FlowcanvasDoc } from '@/lib/canvas/jsoncanvas'

const isCanvas = (rel: string) => /\.(canvas|json)$/.test(rel)

export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? ''
  if (!isCanvas(rel)) return NextResponse.json({ error: 'not a .canvas' }, { status: 400 })
  try {
    const doc = JSON.parse(await readFile(guardPath(rel), 'utf8')) as FlowcanvasDoc
    return NextResponse.json({ doc })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { path: rel, doc } = (await req.json()) as { path: string; doc: FlowcanvasDoc }
  if (!isCanvas(rel) || !doc?.nodes || !doc?.flowcanvas?.session) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  try {
    doc.flowcanvas.session.revision += 1
    doc.flowcanvas.session.updatedAt = new Date().toISOString()
    const abs = guardPath(rel)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, JSON.stringify(doc, null, 2), 'utf8')
    return NextResponse.json({ ok: true, revision: doc.flowcanvas.session.revision })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
