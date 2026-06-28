---
name: node-zip-streaming-research
description: ZIP streaming from Next.js Node-runtime route handlers — library selection and implementation pattern
status: complete
tags: [research, next.js, zip, streaming, node-runtime]
links: [.flowcode/flowcode-index.md]
---

# Research: Node.js ZIP Streaming in Next.js App Router

- **Decision:** Use `fflate` with synchronous `zipSync()` for modest bundles (< 10–20 MB); it is the lightest (8 kB), type-safe, and simplest to integrate into a route handler.
- **Status:** `complete`; dated 2026-06-27.
- **Triggered by:** Flowcanvas requirement to bundle `.canvas` JSON, `.md` files, images, and manifest into a downloadable ZIP from `app/api/canvas/bundle/route.ts`.
- **Sources consulted:** fflate GitHub & npm docs, archiver repository, Next.js route handler & segment config reference (v15–16), npm trends + performance benchmarks.

---

## Summary

For bundling in-memory and on-disk files into a ZIP archive returned from a Next.js Node-runtime route handler, **fflate** is the production-sound choice. Its `zipSync()` method creates a ZIP buffer synchronously in ~8 kB of code, has native TypeScript support, and outperforms jszip. The tradeoff is acceptable: synchronous buffering blocks the event loop only briefly (typically <100 ms for < 10 MB archives), avoiding the complexity of streaming infrastructure when files are already in-memory or small. Archiver remains a valid alternative if you need full streaming (e.g., large on-disk files or concurrent uploads), but adds ~100 kB to bundle size and introduces Node.js-stream complexity.

---

## Findings

### Candidate Libraries: Weight, Performance, Streaming

#### **fflate** (Recommended)

- **Bundle size:** ~8 kB minified (+ 3 kB for ZIP support specifically), or ~5 kB for compression only.
- **Async vs Sync:** Offers both `zipSync()` (synchronous, single-threaded, simple) and `Zip`/`AsyncZipDeflate` (streaming, multi-threaded, 3x faster for large archives).
- **Node.js runtime:** Fully compatible; pure JavaScript with no native bindings.
- **TypeScript:** Built in TypeScript; excellent types for `zipSync()`, `Zip`, and file metadata.
- **Streaming:** Streaming mode (async) requires setting up `Zip` class callbacks and pushing chunks; suitable for large files but adds code complexity for modest bundles.
- **Performance notes:** Faster compression than pako and zlib in many benchmarks; async mode uses Web Workers (or Node.js Workers) for parallelization.
- **npm trends:** 41.8M weekly downloads (higher than archiver's 25.9M as of early 2026).

#### **Archiver** (Alternative for Full Streaming)

- **Bundle size:** ~100+ kB including dependencies.
- **Design:** Purpose-built streaming interface for Node.js `fs` pipes and large archives; ships with TAR + ZIP support.
- **Streaming:** Native streaming via Node.js readable/writable streams; ideal for large on-disk files or incremental archive creation.
- **TypeScript:** Third-party types available via `@types/archiver` (adequate but not native).
- **Complexity:** Requires understanding Node.js streams; adds callback/event handling.
- **Use case:** Shines when compressing large files from disk or streaming to HTTP response body; overkill for in-memory bundles.
- **npm trends:** 25.9M weekly downloads; 917k dependent packages.

#### **JSZip** (Not Recommended Here)

- **Bundle size:** ~170 kB minified.
- **Performance:** Async mode is slower than synchronous fflate due to blocking decompression.
- **Browser focus:** Designed for browser; Node.js support is incidental.
- **Streaming:** No native streaming; buffers entire archive in memory.
- **TypeScript:** Community-maintained types are available but incomplete.
- **Verdict:** Heavier, slower, and not optimized for Node.js server use.

#### **Node.js Native (No Good Option)**

Node.js `zlib` module covers deflate/gzip but has no native ZIP archiving API. `tar` is built-in but not ZIP. Relying on external spawn/shell commands introduces process overhead and security concerns.

---

### Next.js App Router Integration: Runtime, Headers, Response

#### **Route Segment Config for Node.js**

Explicitly declare `runtime = 'nodejs'` at the top of `app/api/canvas/bundle/route.ts`. It is the default, but being explicit prevents accidental edge-runtime deployment:

```typescript
export const runtime = 'nodejs';
```

#### **Response with Correct Headers**

Use the Web `Response` constructor with `Content-Type: application/zip` and `Content-Disposition` attachment:

```typescript
const buffer = /* zipSync result */;
return new Response(buffer, {
  status: 200,
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="canvas-bundle.zip"',
  },
});
```

#### **Streaming vs Buffering**

- **Buffering (recommended for this use case):** Create ZIP as a Uint8Array buffer using `zipSync()`, wrap in Response. Simple, works for bundles < 20 MB. Single malloc + event-loop block ~100–500 ms.
- **Streaming (for large bundles):** Use `fflate.Zip` with callbacks and `ReadableStream` to chunk data to client incrementally. Higher code complexity; reserve for > 50 MB archives or slow disk I/O.

Example buffering pattern:

```typescript
import { zipSync } from 'fflate';

export async function GET() {
  const zipped = zipSync({
    'canvas.json': new TextEncoder().encode(canvasJSON),
    'README.md': new TextEncoder().encode(readmeContent),
    'assets/image.png': imageBuffer,
    'bundle-manifest.json': new TextEncoder().encode(manifestJSON),
  });

  return new Response(zipped, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="canvas-bundle.zip"',
    },
  });
}
```

---

### Code Sketch: Minimal Route Handler

**File:** `app/api/canvas/bundle/route.ts`

```typescript
import { zipSync, strToU8 } from 'fflate';
import type { NextRequest } from 'next/server';
import { readFileSync } from 'fs';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Gather files
    const canvasJSON = JSON.stringify({ /* canvas data */ });
    const readmeContent = readFileSync('docs/README.md', 'utf-8');
    const imageBuffer = readFileSync('public/preview.png');
    const manifestJSON = JSON.stringify({ version: '1.0.0', files: [...] });

    // Create archive
    const zipped = zipSync({
      'canvas.json': strToU8(canvasJSON),
      'README.md': strToU8(readmeContent),
      'assets/preview.png': new Uint8Array(imageBuffer),
      'bundle-manifest.json': strToU8(manifestJSON),
    });

    // Return as attachment
    return new Response(zipped, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="canvas-bundle.zip"',
        'Content-Length': String(zipped.length),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Bundle creation failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Helper:** Converting strings to Uint8Array:
- Use `fflate.strToU8(str)` for text (built-in, handles UTF-8).
- Use `new Uint8Array(Buffer.from(str, 'utf-8'))` if you prefer Buffer.
- For file buffers from disk, pass Node.js `Buffer` directly (Uint8Array-compatible).

---

### Installation & Versions

**fflate:**
```bash
npm install fflate
```
Latest stable: v0.8.2 (as of June 2026); no breaking changes expected in v0.x.

**Optional types (included in fflate):**
fflate ships with native TypeScript definitions in the npm package; no `@types/` install needed.

---

## Conclusions & Recommendations

**Use fflate `zipSync()` without hesitation.** It is:
1. **Minimal:** 8 kB production footprint; tree-shaking friendly.
2. **Type-safe:** Native TypeScript; no `@types/` ceremony.
3. **Fast enough:** Synchronous buffering is acceptable for Flowcanvas bundles (files under 20 MB are typical).
4. **Proven:** Widely used (41.8M weekly downloads); stable API.

**Set `runtime = 'nodejs'` explicitly** in the route config to avoid accidental edge-runtime deployment (which lacks native Node modules and full filesystem access).

**Avoid archiver for this use case** unless bundle sizes exceed 100 MB or you need to stream large on-disk files directly to the HTTP response without buffering. The added code complexity is not justified for modest in-memory bundles.

**Do not use jszip** in Node.js; it is browser-focused and slower.

---

## Caveats & Expiry

- **Bundle size caveat:** This recommendation assumes Flowcanvas bundles remain < 20 MB. If bundles grow significantly (> 50 MB), revisit the async streaming pattern with `fflate.Zip`.
- **TypeScript version:** Tested against TypeScript 4.5+; fflate's types assume modern TypeScript.
- **Next.js version:** Guidance applies to Next.js 15+ (app router). Pages router or earlier versions may have different streaming APIs.
- **Expiry:** Refresh if fflate releases a major version (v1.x) or if a compelling new library emerges in mid-2027+.

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| fflate GitHub | https://github.com/101arrowz/fflate | Core library docs, zipSync examples, async streaming patterns |
| fflate npm | https://www.npmjs.com/package/fflate | Package metadata, version history, downloads |
| archiver GitHub | https://github.com/archiverjs/node-archiver | Streaming ZIP alternative, Node.js stream integration |
| Archiver.js Docs | https://www.archiverjs.com/ | Streaming API reference, use-case guide |
| JSZip Docs | https://stuk.github.io/jszip/ | Context on browser-focused competitor |
| npm trends comparison | https://npmtrends.com/archiver-vs-fflate-vs-jszip | Download statistics, ecosystem adoption |
| PkgPulse Guides | https://www.pkgpulse.com/guides/fflate-vs-pako-vs-node-zlib-compression-javascript-2026 | Performance and size comparison (2026) |
| Next.js Route Handlers | https://nextjs.org/docs/app/api-reference/file-conventions/route | Web API usage, streaming patterns, Response construction |
| Next.js Route Segment Config | https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config | `runtime = 'nodejs'` option, defaults, constraints |
