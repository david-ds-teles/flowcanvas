import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'

// Full-fidelity server markdown → HTML for the reader drawer (design Decision 4: shiki runs ONLY here,
// never per-node). The lightweight client `canvas-markdown.tsx` renders node bodies; this is the heavy,
// syntax-highlighted path used when a node is opened.
//
// Order is deliberate: `remark-rehype` drops raw HTML (no allowDangerousHtml), then `rehype-sanitize`
// scrubs the tree (keeping `language-*` on <code> so the language survives), and `@shikijs/rehype`
// tokenizes AFTER sanitize — its inline-styled <span>s are trusted highlighter output, added last.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeShiki, { theme: 'github-dark-default' })
  .use(rehypeStringify)

/** Render a markdown body (frontmatter already stripped) to sanitized, syntax-highlighted HTML. */
export async function renderMarkdown(body: string): Promise<string> {
  const file = await processor.process(body)
  return String(file)
}
