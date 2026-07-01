---
name: TEI Embeddings (bge-m3)
description: Self-hosted multilingual embeddings sidecar
source:
  path: boards/msgflow-mvp-design.md
  anchor: technology-stack
---
**Self-hosted Text-Embeddings-Inference sidecar serving the multilingual `BAAI/bge-m3` model, keeping PDF and customer text off any third-party LLM endpoint.**

**Responsibilities**
- Embeds PDF chunks at ingest time, written into `document_chunk.embedding`.
- Embeds the customer's question at query time for retrieval.
- Sits behind an `EmbeddingProvider` abstraction so the model/runtime can be swapped without touching ingestion or retrieval code.

**Contract / Interface**
- Model: `BAAI/bge-m3` — multilingual (covers Portuguese), `1024`-dim dense vectors.
- Runtime: local Text-Embeddings-Inference (TEI) container, no per-call API cost.
- Consumers: `src/msgflow/knowledge/embeddings.py` (ingest path) and `src/msgflow/knowledge/retrieval.py` (query path).
- Output feeds: `document_chunk.embedding` (`pgvector`, `1024`-dim).

**Talks to**
- `PDF Ingest Job` `->` sends extracted chunk text, receives embeddings to persist.
- `LangGraph Agent` retrieval tool `->` sends the customer's question, receives the query embedding for ANN search.
- `document_chunk (pgvector)` `<-` embeddings are persisted there, never held by TEI itself.

**Constraints & decisions**
- Decision traces to the Constraint "Customer PII sent to third-party model provider" (LGPD/GDPR disclosure risk) — mitigated by keeping PDF text on this self-hosted sidecar instead of routing it through the `LlmProvider`/OpenRouter path.
- Why self-hosted over an API embeddings provider: zero per-call cost at scale, and document text never leaves the deployment boundary.
- The `EmbeddingProvider` abstraction mirrors the `LlmProvider` swappability pattern — isolates the rest of the system from this specific model/runtime choice.
