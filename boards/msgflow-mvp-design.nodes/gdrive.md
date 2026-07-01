---
name: Google Drive (PDFs)
description: Company-PDF source folder for document Q&A
source:
  path: boards/msgflow-mvp-design.md
  anchor: scope
---
**The per-business Google Drive folder of company PDFs that feeds msgflow's document-Q&A retrieval pipeline.**

**Responsibilities**
- Source of truth for a business's company documents (policies, menus, FAQs, etc.) used for grounded Q&A.
- Listed and downloaded in batch by the PDF ingest job — not read live per customer question.

**Contract / Interface**
- OAuth scope: `drive.file` — app-scoped (only files the app created or the user explicitly shared), non-restricted.
- PDF bytes extracted with `pypdf` (fallback `pdfplumber`), then chunked, embedded, and stored in `document` / `document_chunk` (pgvector HNSW).
- Folder reference held per business under `knowledge_source` (module: `src/msgflow/tenancy`).

**Talks to**
- PDF ingest job `->` lists + downloads files via the Drive API
- `document_chunk` `<-` ingest writes chunks + embeddings here for retrieval
- `google_connection` `<-` supplies the token used to authenticate the Drive call

**Constraints & decisions**
- `drive.file` chosen specifically over broader Drive scopes to stay non-restricted and skip Google's security assessment, at the cost of limiting the agent to app-scoped/explicitly-shared files.
- Ingest is read-only; no write-back to Drive is in scope for MVP.
- Risk: refresh-token expiry stalls ingestion for that business — same `RefreshError` / `token_status` / escalate handling as Calendar and Sheets.