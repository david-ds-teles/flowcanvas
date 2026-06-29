---
name: tei-sidecar
kind: service
description: TEI Embeddings Sidecar — HuggingFace Text Embeddings Inference serving BAAI/bge-m3 for zero-cost multilingual embeddings.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: retrieval--knowledge-ingestion-rag
---

# TEI Embeddings Sidecar

**Container:** `embeddings` service in Docker Compose  
**Client module:** `src/msgflow/knowledge/embeddings.py`

Serves `BAAI/bge-m3` (1024-dim dense vectors, multilingual, 100+ languages including pt-BR) via the HuggingFace Text Embeddings Inference server.

**Why bge-m3 over hosted OpenAI embeddings:**
- Multilingual out-of-the-box (customers may write in Portuguese, English, Spanish, etc.).
- Zero per-call cost; no third-party data egress for customer document text.
- Keeps FastAPI + arq workers light (model lives in the sidecar process).
- `EmbeddingProvider` ABC allows a future swap without touching ingestion or retrieval code.

**API:**
- Endpoint: `POST /embed` (`EMBEDDING_BASE_URL=http://embeddings:80`)
- Input: `list[str]` — batch of up to 32 text inputs.
- Output: `list[list[float]]` — 1024-dimensional dense vectors.
- Batch size: 32 inputs per request (`EMBEDDING_DIM=1024`).

**Used by:** Knowledge Ingester (at ingest time) and `answer_from_documents` tool (at query time to embed the customer's question).
