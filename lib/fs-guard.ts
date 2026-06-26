import path from 'node:path'

/** Thrown when a requested path resolves outside FLOWCANVAS_ROOT. Mapped to HTTP 400 by every route. */
export class GuardError extends Error {}

/** Root every fs route is confined to. Defaults to the dev server's cwd. */
export const ROOT = path.resolve(process.env.FLOWCANVAS_ROOT ?? process.cwd())

/** Resolve `rel` against ROOT and reject any path that escapes it. Lexical normalization only — `../` and absolute paths are blocked; filesystem symlinks are not dereferenced. */
export function guardPath(rel: string): string {
  const abs = path.resolve(ROOT, rel)
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) throw new GuardError(`path escapes root: ${rel}`)
  return abs
}
