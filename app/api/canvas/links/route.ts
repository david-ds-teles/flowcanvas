import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'node:fs/promises'
import matter from 'gray-matter'
import { guardPath, GuardError } from '@/lib/fs-guard'
import { stringifyFile } from '@/lib/canvas/frontmatter'

// Body-preserving patch of a markdown file's `links:` frontmatter (Phase 8, Fix 5). The canvas
// write-back calls this when a file↔file edge is drawn (add) or deleted (remove) so the source `.md`
// and the board stay in sync. Reads the FULL file (not the BODY_CAP-capped parseFile) so the body is
// re-serialized byte-for-byte; only `data.links` changes.
const MD = /\.mdx?$/
const norm = (p: string) => p.replace(/^\.?\//, '').replace(/\\/g, '/')

export async function POST(req: NextRequest) {
  const { path: rel, add = [], remove = [] } = (await req.json()) as { path: string; add?: string[]; remove?: string[] }
  if (!rel || !MD.test(rel)) return NextResponse.json({ error: 'not a .md' }, { status: 400 })
  try {
    const abs = guardPath(rel)
    const { data, content } = matter(await readFile(abs, 'utf8'))
    const links = Array.isArray(data.links) ? (data.links as unknown[]).map(String) : []
    const rm = new Set(remove.map(norm))
    const next = links.filter((l) => !rm.has(norm(l)))
    for (const a of add) if (!next.some((l) => norm(l) === norm(a))) next.push(a)
    if (next.length) data.links = next
    else delete data.links
    await writeFile(abs, stringifyFile(data as Record<string, unknown>, content), 'utf8')
    return NextResponse.json({ ok: true, links: next })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
