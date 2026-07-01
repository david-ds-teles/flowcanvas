---
name: answer_from_documents tool
description: RAG retrieval + grounded synthesis over company PDFs
source:
  path: boards/msgflow-mvp-design.md
  anchor: data-models
---
**A RAG grounding tool that answers free-form questions from the business's own company PDFs, never from model memory.**

**Responsibilities**
- Embeds the customer's question with the same model used at ingest, then runs a tenant-scoped ANN search over `document_chunk`.
- Drops chunks below the minimum cosine-similarity threshold (`RETRIEVAL_MIN_COSINE`) so weak matches never ground an answer.
- Hands the surviving top-k chunks to the agent as `retrieved_context`; the synthesized answer cites its `sources`.
- Floors confidence to `0.0` when nothing survives retrieval, so the turn cannot be answered ungrounded.

**Contract / Interface**
- Tool signature: `answer_from_documents(question: str) -> DocAnswer`, `DocAnswer { answer: str, sources: list[RetrievedChunk], confidence: float }`.
- Embeddings: `EMBEDDING_MODEL = "BAAI/bge-m3"` (`EMBEDDING_DIM = 1024`, multilingual incl. Portuguese), served by a local TEI sidecar at `EMBEDDING_BASE_URL` behind an `EmbeddingProvider` ABC; rejected alternative `text-embedding-3-*` (English-centric, per-call cost, OpenRouter doesn't proxy embeddings).
- Query: `SELECT ... FROM document_chunk WHERE business_id = :bid ORDER BY embedding <=> :q LIMIT RETRIEVAL_TOP_K` (`5`) via pgvector `hnsw (vector_cosine_ops)`; drops chunks below `RETRIEVAL_MIN_COSINE` (`0.30`).
- `business_id` is bound via closure/RunnableConfig — never an LLM-supplied argument.

**Talks to**
- `LangGraph Agent Graph` (`agent` node) -> invokes this tool during the tool-calling loop.
- This tool -> `TEI sidecar` (local embedding inference) -> Postgres `pgvector` for the ANN query.
- Empty retrieval -> `escalate_to_human(reason=unsupported|low_confidence)`.

**Constraints & decisions**
- pgvector index / scale risk: HNSW recall degrades when filtered by `business_id`; mitigated by the `business_id` btree + HNSW cosine index and pgvector >= 0.8 iterative scans (Constraints & Risks).
- TEI sidecar chosen over a hosted embeddings API specifically to keep customer PDF text off a third-party endpoint (LGPD/GDPR mitigation, Constraints & Risks).