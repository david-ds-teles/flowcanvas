---
name: Knowledge Ingester
kind: process
description: Knowledge Ingester — daily arq cron job that ingests company PDFs from Google Drive into pgvector document chunks.
source:
  path: boards/msgflow-mvp.md
  anchor: retrieval--knowledge-ingestion-rag
---

# Knowledge Ingester

**Module:** `src/msgflow/knowledge/` — `ingest.py`, `chunk.py`, `embeddings.py`

Async arq cron job (daily) that keeps the PDF knowledge base current. Also triggered on demand at Google OAuth onboarding.

**Pipeline per `pdf_drive_folder` knowledge source:**
1. `GoogleClient.list_drive_pdfs(folder_id)` — list all PDFs via `files.list`.
2. **Change detection:** compare `drive_modified_time` + content `checksum` vs `document` row — skip unchanged files.
3. `GoogleClient.download(file_id)` → raw PDF bytes.
4. **Text extraction:** Primary `pypdf`; fallback `pdfplumber` when text empty OR printable-char ratio < 0.60. Both empty → `ingest_status='failed'`.
5. Normalize whitespace; **tiktoken `cl100k_base`** chunk at `CHUNK_TOKENS=512` with `CHUNK_OVERLAP_TOKENS=64`.
6. Batch-embed (32 inputs/req) via `EmbeddingProvider → TEI sidecar POST /embed`.
7. Delete-and-replace `document_chunk` rows in one transaction; set `document.ingest_status='ready'`.

**Query time** (called by `answer_from_documents`):
- Embed question → ANN: `SELECT … WHERE business_id=:bid ORDER BY embedding <=> :q LIMIT :k`.
- Drop chunks below `RETRIEVAL_MIN_COSINE=0.30`. Empty result → `DocAnswer(confidence=0.0)` → escalate.
