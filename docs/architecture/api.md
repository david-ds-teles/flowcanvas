---
name: API — guarded fs routes
status: stable
tags: [api, backend, fs, next]
description: The thin Next.js Route Handlers wrapping Node fs — read/write the .canvas, batch-resolve markdown frontmatter+body, stream local images. Every route is path-traversal guarded.
links:
  - docs/architecture/fs-guard.md
  - docs/architecture/frontmatter.md
---

## Responsibility

`app/api/{canvas,canvas/resolve,asset,file,files}/route.ts` are the backend — thin Route Handlers over Node `fs`:

- `GET/POST /api/canvas` — read/write the `.canvas` document.
- `POST /api/canvas/resolve` — batch-resolve referenced markdown into `{ path, frontmatter, body, truncated }` (via the frontmatter wrapper).
- `/api/asset`, `/api/file`, `/api/files` — stream images, read/write a file, list a directory.

## Why

Every route runs `guardPath` first, so a path can never escape the project root. The backend stays thin: all graph logic lives in the pure library; the API only touches disk.
