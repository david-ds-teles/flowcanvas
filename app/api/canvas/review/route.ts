import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'
import type { ReviewState } from '@/lib/canvas/review'

// Decision 6 — change-review snapshot persisted to a sibling <board-stem>.review.json at Submit,
// read back after the agent round, deleted on accept/discard. Guarded; canvas-route error mapping.
export const runtime = 'nodejs'

const isCanvas = (rel: string) => /\.(canvas|json)$/.test(rel)
const reviewPathFor = (board: string) => board.replace(/\.(canvas|json)$/, '') + '.review.json'

export async function GET(req: NextRequest) {
  const board = req.nextUrl.searchParams.get('path') ?? ''
  if (!isCanvas(board)) return NextResponse.json({ error: 'not a .canvas' }, { status: 400 })
  try {
    const raw = await readFile(guardPath(reviewPathFor(board)), 'utf8')
    return NextResponse.json({ review: JSON.parse(raw) as ReviewState })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ review: null })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { path: board, review } = (await req.json()) as { path: string; review: ReviewState }
  if (!isCanvas(board) || !review || typeof review.baseRevision !== 'number' || !review.snapshot) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  try {
    const abs = guardPath(reviewPathFor(board))
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, JSON.stringify(review, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const board = req.nextUrl.searchParams.get('path') ?? ''
  if (!isCanvas(board)) return NextResponse.json({ error: 'not a .canvas' }, { status: 400 })
  try {
    await unlink(guardPath(reviewPathFor(board)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ ok: true }) // already gone
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
