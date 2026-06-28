// lib/canvas/refs.ts — Decision 9 (reference navigation). Pure: no fs, no DOM.

export type RefKind = 'frontmatter' | 'link' | 'image'

export interface DocRef {
  kind: RefKind
  target: string        // root-relative path OR absolute URL
  anchor?: string       // heading slug after '#', when present
  isExternal: boolean   // true for http(s) URLs
}

const URL_RE = /^https?:\/\//i
// captures: [1] leading '!' for images, [2] the href (no whitespace, optional "title" dropped)
const MD_LINK_RE = /(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/** Resolve a relative target against a root-relative base file's directory; normalize ./ and ../ */
function resolveRel(basePath: string, target: string): string {
  if (target.startsWith('/')) return target.replace(/^\/+/, '')
  const baseDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : ''
  const parts = (baseDir ? baseDir.split('/') : []).concat(target.split('/'))
  const out: string[] = []
  for (const p of parts) {
    if (p === '' || p === '.') continue
    if (p === '..') { out.pop(); continue }
    out.push(p)
  }
  return out.join('/')
}

function splitAnchor(raw: string): { path: string; anchor?: string } {
  const i = raw.indexOf('#')
  return i === -1 ? { path: raw } : { path: raw.slice(0, i), anchor: raw.slice(i + 1) || undefined }
}

/** Pure: frontmatter links: + body [text](x.md) + ![](img). */
export function extractRefs(
  basePath: string,
  frontmatter: Record<string, unknown> | undefined,
  body: string | undefined,
): DocRef[] {
  const out: DocRef[] = []
  const seen = new Set<string>()
  const push = (kind: RefKind, rawTarget: string) => {
    const isExternal = URL_RE.test(rawTarget)
    let target = rawTarget
    let anchor: string | undefined
    if (isExternal) {
      const h = rawTarget.indexOf('#')
      if (h !== -1) { target = rawTarget.slice(0, h); anchor = rawTarget.slice(h + 1) || undefined }
    } else {
      const sa = splitAnchor(rawTarget)
      anchor = sa.anchor
      // frontmatter links: are root-relative (flowcode convention — see file-conventions);
      // body links (./ ../) resolve against the source file's directory.
      target = kind === 'frontmatter' ? sa.path.replace(/^\/+/, '') : resolveRel(basePath, sa.path)
    }
    if (!target) return
    const key = `${kind}|${target}|${anchor ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ kind, target, anchor, isExternal })
  }

  const links = frontmatter?.links
  if (Array.isArray(links)) {
    for (const l of links) if (typeof l === 'string' && l.trim()) push('frontmatter', l.trim())
  }

  if (body) {
    MD_LINK_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = MD_LINK_RE.exec(body)) !== null) {
      const raw = m[2].trim()
      if (!raw || raw.startsWith('#')) continue   // skip pure in-doc anchors
      push(m[1] === '!' ? 'image' : 'link', raw)
    }
  }

  return out
}
