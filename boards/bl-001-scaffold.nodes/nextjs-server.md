---
name: Next.js 15 Server
description: Local Node standalone server — App Router, output standalone, Node runtime on all routes.
source:
  path: boards/bl-001-scaffold.md
  anchor: runtime-model
---
Next.js 15 App Router running as `output: 'standalone'` local Node process. Handles all HTTP requests; renders RSCs server-side. No Edge runtime — Node runtime required for future `fs` access in BL-002+.
