import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import matter from 'gray-matter'
import { zipSync, strToU8 } from 'fflate'
import { guardPath, GuardError } from '@/lib/fs-guard'
import { isFileNode } from '@/lib/canvas/jsoncanvas'
import { projectLinksForExport } from '@/lib/canvas/edges'
import { stringifyFile } from '@/lib/canvas/frontmatter'
import type { FlowcanvasDoc } from '@/lib/canvas/jsoncanvas'

// Decision 10 — portable bundle. Streams a zip of the .canvas + every referenced .md (with links:
// projected from the authoritative canvas edges) + every referenced asset + a bundle-manifest.json.
// Out-of-root / missing refs are recorded in the manifest, not fatal. fflate zipSync (modest sizes).
export const runtime = 'nodejs'

const isCanvas = (rel: string) => /\.(canvas|json)$/.test(rel)
const MD = /\.mdx?$/

export async function GET(req: NextRequest) {
  const board = req.nextUrl.searchParams.get('path') ?? ''
  if (!isCanvas(board)) return NextResponse.json({ error: 'not a .canvas' }, { status: 400 })
  try {
    const doc = JSON.parse(await readFile(guardPath(board), 'utf8')) as FlowcanvasDoc
    const projected = projectLinksForExport(doc)
    const files: Record<string, Uint8Array> = {}
    const manifest: { original: string; bundled: string; kind: string }[] = []
    const skipped: { path: string; reason: string }[] = []

    for (const n of doc.nodes) {
      if (!isFileNode(n)) continue
      const rel = n.file
      if (files[rel]) continue // same file referenced by two nodes — bundle once
      let abs: string
      try {
        abs = guardPath(rel)
      } catch {
        skipped.push({ path: rel, reason: 'escapes root' })
        continue
      }
      try {
        if (MD.test(rel)) {
          const { data, content } = matter(await readFile(abs, 'utf8'))
          const links = projected[rel]
          if (links?.length) (data as Record<string, unknown>).links = links
          else delete (data as Record<string, unknown>).links
          files[rel] = strToU8(stringifyFile(data as Record<string, unknown>, content))
          manifest.push({ original: rel, bundled: rel, kind: 'markdown' })
        } else {
          files[rel] = new Uint8Array(await readFile(abs))
          manifest.push({ original: rel, bundled: rel, kind: 'asset' })
        }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
          skipped.push({ path: rel, reason: 'missing' })
          continue
        }
        throw e
      }
    }

    files[board] = strToU8(JSON.stringify(doc, null, 2))
    manifest.push({ original: board, bundled: board, kind: 'canvas' })
    files['bundle-manifest.json'] = strToU8(JSON.stringify({ board, files: manifest, skipped }, null, 2))

    const zipped = zipSync(files, { level: 6 })
    const stem = board.slice(board.lastIndexOf('/') + 1).replace(/\.(canvas|json)$/, '')
    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${stem}-bundle.zip"`,
      },
    })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
