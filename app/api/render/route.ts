import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { guardPath, GuardError } from '@/lib/fs-guard'
import { parseFile } from '@/lib/canvas/frontmatter'
import { renderMarkdown } from '@/lib/render-md'

const MD = /\.mdx?$/

// GET /api/render?path=<md path> → { html } — full-fidelity rendered markdown body (shiki) for the
// reader drawer. Guarded like every fs route; only markdown is renderable.
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? ''
  if (!MD.test(rel)) return NextResponse.json({ error: 'not a .md' }, { status: 400 })
  try {
    const raw = await readFile(guardPath(rel), 'utf8')
    const { body } = parseFile(raw)
    const html = await renderMarkdown(body)
    return NextResponse.json({ html })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
