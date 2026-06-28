import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { guardPath, GuardError } from '@/lib/fs-guard'

// Decision 5 — active-board pointer the MCP sidecar reads so the harness operates on whatever board
// is open. Written by the store on every load/openBoard; read by GET /api/canvas/active + get_active_board.
export const runtime = 'nodejs'

const ACTIVE_POINTER = '.flowcanvas/active-board.json'

interface ActiveBoard {
  canvasRef: string
  baseRevision: number
  intent: string
}

export async function GET() {
  try {
    const raw = await readFile(guardPath(ACTIVE_POINTER), 'utf8')
    return NextResponse.json(JSON.parse(raw) as ActiveBoard)
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ active: null })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ActiveBoard>
  if (!body?.canvasRef || typeof body.baseRevision !== 'number') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  try {
    const abs = guardPath(ACTIVE_POINTER)
    await mkdir(path.dirname(abs), { recursive: true })
    const pointer: ActiveBoard = { canvasRef: body.canvasRef, baseRevision: body.baseRevision, intent: body.intent ?? '' }
    await writeFile(abs, JSON.stringify(pointer, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof GuardError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
