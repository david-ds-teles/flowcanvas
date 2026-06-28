import type { FlowcanvasDoc } from './canvas/jsoncanvas'
import type { ReviewState } from './canvas/review'
import type { CanvasTemplate } from './canvas/templates'

/** The active-board pointer the MCP sidecar reads (Decision 5). */
export interface ActiveBoard {
  canvasRef: string
  baseRevision: number
  intent: string
}

/** One entry of a `/api/canvas/resolve` response. Markdown-only fields are absent for images/other. */
export interface ResolvedFile {
  path: string
  exists: boolean
  frontmatter?: Record<string, unknown>
  body?: string
  truncated?: boolean
  error?: string
}

/** One entry of a `/api/files` directory listing. */
export interface DirEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  ext?: string
}

/** Resolve a JSON response, throwing the route's `{ error }` message on a non-2xx status. */
async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(detail.error ?? `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function getCanvas(path: string): Promise<FlowcanvasDoc> {
  const res = await fetch(`/api/canvas?path=${encodeURIComponent(path)}`)
  const { doc } = await jsonOrThrow<{ doc: FlowcanvasDoc }>(res)
  return doc
}

/** POST the doc; returns the server-bumped revision. */
export async function saveCanvas(path: string, doc: FlowcanvasDoc): Promise<number> {
  const res = await fetch('/api/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, doc }),
  })
  const { revision } = await jsonOrThrow<{ ok: true; revision: number }>(res)
  return revision
}

export async function resolvePaths(paths: string[]): Promise<ResolvedFile[]> {
  const res = await fetch('/api/canvas/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  })
  const { resolved } = await jsonOrThrow<{ resolved: ResolvedFile[] }>(res)
  return resolved
}

/** Write agent-generated markdown to `path` (must be `.md`/`.mdx`). */
export async function writeFileApi(path: string, content: string): Promise<void> {
  const res = await fetch('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
  await jsonOrThrow<{ ok: true }>(res)
}

/** Read a file's raw content (no BODY_CAP). Backs the MCP `read_file` tool (v2). */
export async function readFileApi(path: string): Promise<string> {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
  const { content } = await jsonOrThrow<{ content: string }>(res)
  return content
}

/** Delete a markdown file. Backs `discardRound` rolling back a round's generated files (v2, Decision 6). */
export async function deleteFileApi(path: string): Promise<void> {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  await jsonOrThrow<{ ok: true }>(res)
}

export async function listDir(path = '.'): Promise<DirEntry[]> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
  const { entries } = await jsonOrThrow<{ entries: DirEntry[] }>(res)
  return entries
}

/** Multipart-upload an image/markdown file; returns the relative path written under root. */
export async function uploadFile(file: File, dir?: string): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  if (dir) form.append('dir', dir)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  const { path } = await jsonOrThrow<{ path: string }>(res)
  return path
}

/** URL that streams an image's bytes through the guarded asset route. */
export function assetUrl(path: string): string {
  return `/api/asset?path=${encodeURIComponent(path)}`
}

// ─────────────────────────── v2 — change-review, templates, active board, bundle ───────────────────────────

/** Read the submit-time review snapshot for a board (null when no round is pending). Decision 6. */
export async function getReview(path: string): Promise<ReviewState | null> {
  const res = await fetch(`/api/canvas/review?path=${encodeURIComponent(path)}`)
  const { review } = await jsonOrThrow<{ review: ReviewState | null }>(res)
  return review
}

/** Capture the submit-time snapshot into the sibling review file. Decision 6. */
export async function putReview(path: string, review: ReviewState): Promise<void> {
  const res = await fetch('/api/canvas/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, review }),
  })
  await jsonOrThrow<{ ok: true }>(res)
}

/** Clear the review snapshot (accept or discard outcome). Decision 6. */
export async function clearReview(path: string): Promise<void> {
  const res = await fetch(`/api/canvas/review?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  await jsonOrThrow<{ ok: true }>(res)
}

/** URL that streams the portable zip bundle for a board (used as an `<a download>` target). Decision 10. */
export function bundleUrl(path: string): string {
  return `/api/canvas/bundle?path=${encodeURIComponent(path)}`
}

/** List the available `.canvas` template fragments. Decision 8. */
export async function listTemplates(): Promise<CanvasTemplate[]> {
  const res = await fetch('/api/templates')
  const { templates } = await jsonOrThrow<{ templates: CanvasTemplate[] }>(res)
  return templates
}

/** Read the active-board pointer (null when none is set). Decision 5. */
export async function getActive(): Promise<ActiveBoard | null> {
  const res = await fetch('/api/canvas/active')
  const data = await jsonOrThrow<ActiveBoard | { active: null }>(res)
  return 'active' in data ? null : data
}

/** Write the active-board pointer on load / openBoard. Decision 5. */
export async function putActive(active: ActiveBoard): Promise<void> {
  const res = await fetch('/api/canvas/active', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(active),
  })
  await jsonOrThrow<{ ok: true }>(res)
}
