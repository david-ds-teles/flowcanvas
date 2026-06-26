import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { guardPath, GuardError } from '@/lib/fs-guard'

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif' }
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get('path') ?? ''
  const type = TYPES[rel.slice(rel.lastIndexOf('.')).toLowerCase()]
  if (!type) return NextResponse.json({ error: 'not an allowed image' }, { status: 400 })
  try {
    const buf = await readFile(guardPath(rel))
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
