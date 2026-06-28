import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'
import type { CanvasTemplate } from '@/lib/canvas/templates'

// Decision 8 — template library. Templates live as CanvasTemplate JSON fragments under templates/*.canvas
// (root-relative). GET lists them; ?id= resolves one. A missing templates/ dir is not an error.
export const runtime = 'nodejs'

const TEMPLATES_DIR = 'templates'

async function loadTemplates(): Promise<CanvasTemplate[]> {
  let dir: string
  try { dir = guardPath(TEMPLATES_DIR) } catch { return [] }
  let names: string[]
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.canvas'))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  const out: CanvasTemplate[] = []
  for (const name of names.sort()) {
    try {
      const t = JSON.parse(await readFile(path.join(dir, name), 'utf8')) as CanvasTemplate
      if (t && t.id && t.kind && Array.isArray(t.nodes) && Array.isArray(t.edges)) out.push(t)
    } catch {
      // skip a malformed fragment rather than failing the whole listing
    }
  }
  return out
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const templates = await loadTemplates()
    if (id) {
      const template = templates.find((t) => t.id === id)
      if (!template) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ template })
    }
    return NextResponse.json({ templates })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
