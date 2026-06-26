'use client'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { assetUrl } from '@/lib/api'

// Already a URL we can use directly — external host, data/blob URI, or already routed.
const DIRECT = /^(https?:|data:|blob:|\/api\/asset)/

/**
 * Resolve a markdown image `src` to a guarded `/api/asset` URL, relative to the source file's
 * directory. Without this, an embedded `![](diagram.png)` resolves against the page URL and 404s —
 * so only externally-hosted images would load. Routing through the asset API makes any allowed
 * image type (png/jpg/webp/gif/avif/svg) render inline.
 */
function resolveImageSrc(src: string | undefined, basePath: string): string | undefined {
  if (!src || DIRECT.test(src)) return src
  const clean = src.replace(/^\.\//, '').replace(/^\//, '')
  const dir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : ''
  return assetUrl(dir ? `${dir}/${clean}` : clean)
}

/** Thin in-node markdown renderer. `basePath` is the source file, used to resolve relative images. */
export function CanvasMarkdown({ children, basePath = '' }: { children: string; basePath?: string }) {
  const components: Components = {
    img({ src, alt }) {
      const resolved = resolveImageSrc(typeof src === 'string' ? src : undefined, basePath)
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={resolved} alt={alt ?? ''} loading="lazy" />
    },
    a({ href, children: kids }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {kids}
        </a>
      )
    },
  }
  return (
    <div className="fc-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
