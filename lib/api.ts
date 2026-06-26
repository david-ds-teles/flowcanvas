import type { FlowcanvasDoc } from './canvas/jsoncanvas'

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
