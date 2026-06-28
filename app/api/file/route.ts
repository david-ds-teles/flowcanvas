import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'

// Reads/writes/deletes under FLOWCANVAS_ROOT via node:fs — pin to the Node runtime (matches the other
// v2 guarded routes; the GET raw-read + DELETE were added in Phase 4 for the MCP read_file + discardRound).
export const runtime = 'nodejs'

const MD = /\.mdx?$/

// Raw file read — backs the MCP `read_file` tool (v2). Returns the full content (no BODY_CAP),
// so an agent can read a whole design doc for extraction.
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? ''
  if (!rel) return NextResponse.json({ error: 'no path' }, { status: 400 })
  try {
    const content = await readFile(guardPath(rel), 'utf8')
    return NextResponse.json({ content })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Delete a markdown file — backs `discardRound` rolling back a round's generated files (v2, Decision 6).
export async function DELETE(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? ''
  if (!rel || !MD.test(rel)) return NextResponse.json({ error: 'not a .md' }, { status: 400 })
  try {
    await unlink(guardPath(rel))
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ ok: true }) // already gone
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { path: rel, content } = (await req.json()) as { path: string; content: string }
  if (!rel || !MD.test(rel) || typeof content !== 'string') return NextResponse.json({ error: 'not a .md' }, { status: 400 })
  try {
    const abs = guardPath(rel)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, content, 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
