import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { guardPath, GuardError } from '@/lib/fs-guard'
import { parseFile } from '@/lib/canvas/frontmatter'

const MD = /\.mdx?$/
export async function POST(req: NextRequest) {
  const { paths } = (await req.json()) as { paths: string[] }
  const resolved = await Promise.all(paths.map(async (rel) => {
    try {
      const raw = await readFile(guardPath(rel), 'utf8')
      return MD.test(rel) ? { path: rel, exists: true, ...parseFile(raw) } : { path: rel, exists: true }
    } catch (e) {
      if (e instanceof GuardError) return { path: rel, exists: false, error: e.message }
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { path: rel, exists: false }
      return { path: rel, exists: false, error: String(e) }
    }
  }))
  return NextResponse.json({ resolved })
}
