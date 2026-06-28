---
name: FS guard — path-traversal guard
status: stable
tags: [api, security, fs]
description: The single path-traversal guard every API route calls before touching disk — resolves a request path against FLOWCANVAS_ROOT and rejects any escape.
links:
  - docs/architecture/api.md
---

## Responsibility

`lib/fs-guard.ts` resolves a request-supplied relative path against the configured project root and **rejects any path that escapes it** (`..`, absolute paths, symlink games). It throws a typed `GuardError` the routes turn into a `400`.

## Why

The backend reads and writes real files from user/agent-supplied paths. One guard, called by every route before any `fs` call, is the whole security boundary — small, auditable, and impossible to forget because the routes share it.
