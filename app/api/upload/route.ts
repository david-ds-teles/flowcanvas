import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
const MARKDOWN_EXT = new Set(['.md', '.mdx'])
const UPLOAD_MAX = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 })
  const dirField = form.get('dir')
  const dir = (typeof dirField === 'string' && dirField) || 'assets/'
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!IMAGE_EXT.has(ext) && !MARKDOWN_EXT.has(ext)) return NextResponse.json({ error: 'extension not allowed' }, { status: 400 })
  if (file.size > UPLOAD_MAX) return NextResponse.json({ error: 'file too large' }, { status: 413 })
  const rel = path.posix.join(dir, file.name)
  try {
    const abs = guardPath(rel)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, new Uint8Array(await file.arrayBuffer()))
    return NextResponse.json({ path: rel })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
