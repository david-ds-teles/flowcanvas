import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'

export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? '.'
  try {
    const ents = await readdir(guardPath(rel), { withFileTypes: true })
    const entries = ents.map((d) => ({
      name: d.name, path: path.posix.join(rel, d.name),
      type: d.isDirectory() ? 'directory' : 'file',
      ext: d.isFile() ? d.name.slice(d.name.lastIndexOf('.')) : undefined,
    }))
    return NextResponse.json({ entries })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
