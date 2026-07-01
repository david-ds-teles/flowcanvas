---
name: PDF Ingest Job (arq cron)
description: Scheduled job that syncs and chunks Drive PDFs
source:
  path: boards/msgflow-mvp-design.md
  anchor: technology-stack
---
**Scheduled `arq` cron job that syncs a business's Drive PDF folder into searchable, tenant-scoped chunks for the agent's document Q&A tool.**

**Responsibilities**
- Lists and downloads each `knowledge_source`'s PDFs from Drive (scope `drive.file`), skipping unchanged files via modified-time/checksum.
- Extracts text with `pypdf`, falling back to `pdfplumber` on poor extraction.
- Token-chunks (512 tokens, 64-token overlap) and embeds chunks via the TEI sidecar.
- Delete-and-replaces that document's `document_chunk` rows in one transaction; runs daily to stay in sync with Drive edits.

**Contract / Interface**
- Module: `src/msgflow/knowledge/ingest.py` + `chunk.py` ("PDF ingest, chunking, embeddings, retrieval, price lookup" per Module Boundaries).
- Google scope: `drive.file` — the minimal per-business OAuth scope (In Scope: "Per-business Google OAuth onboarding... Minimal scopes").
- Trigger: `arq` cron, daily — same Redis/arq infra as `handle_inbound`, scheduled rather than event-triggered.
- Writes: `document_chunk` rows, tenant-scoped by `business_id`.

**Talks to**
- Google Drive `<-` lists/downloads PDFs from the business's configured knowledge-source folder.
- `TEI Embeddings (bge-m3)` `->` sends chunk text, receives embeddings.
- `document_chunk (pgvector)` `->` writes embedded chunks, transactional delete-and-replace per document.

**Constraints & decisions**
- Scope decision: a new business onboards by pointing this job at its Drive PDF folder via configuration — no code change (Success Criteria).
- `drive.file` is the narrowest viable scope — keeps the OAuth consent screen out of Google's restricted-scope security-assessment tier (ties to the OAuth Constraints & Risks row).
- Delete-and-replace-in-one-transaction avoids a window where stale and fresh chunks coexist for the same document during a re-sync.
