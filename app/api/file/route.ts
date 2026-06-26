import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'

const MD = /\.mdx?$/
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
