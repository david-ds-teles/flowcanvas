---
name: Google Drive
kind: external
description: Google Drive API — app-scoped PDF listing and download powering the knowledge ingestion pipeline.
source:
  path: boards/msgflow-mvp.md
  anchor: retrieval--knowledge-ingestion-rag
---

# Google Drive API

**Scope:** `https://www.googleapis.com/auth/drive.file`  
**Module:** `src/msgflow/google/drive.py`  
**Used by:** Knowledge Ingester (ingest pipeline) + `answer_from_documents` tool (via retrieved chunks stored in Postgres)

`drive.file` is an **app-scoped** grant — only files the app itself created or opened are accessible. This avoids the full Drive restricted-scope security review during Google OAuth consent-screen publication.

**Operations:**
- `GoogleClient.list_drive_pdfs(folder_id)` → `list[DriveFile]` — `files.list` filtered to `mimeType='application/pdf'` within the configured Drive folder.
- `GoogleClient.download(file_id)` → `bytes` — `files.get?alt=media` to stream raw PDF bytes for text extraction.

**Change detection fields returned:** `id`, `name`, `mimeType`, `modifiedTime` → stored in `document.drive_file_id` / `document.drive_modified_time` for incremental re-ingestion.
