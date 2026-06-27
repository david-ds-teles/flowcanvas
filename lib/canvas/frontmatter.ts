import matter from 'gray-matter'

/** Resolved bodies longer than this are truncated; `truncated:true` signals the cut. */
export const BODY_CAP = 40_000

/** Split a raw markdown file into parsed frontmatter + a body capped at BODY_CAP. */
export function parseFile(raw: string) {
  const { data, content } = matter(raw)
  const truncated = content.length > BODY_CAP
  return {
    frontmatter: data as Record<string, unknown>,
    body: truncated ? content.slice(0, BODY_CAP) : content,
    truncated,
  }
}

/** Re-serialize a markdown file from its frontmatter + body (the inverse of `parseFile`). */
export function stringifyFile(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(body, frontmatter)
}
