---
name: document_chunk (pgvector)
description: Embedded, tenant-scoped PDF text chunks
source:
  path: boards/msgflow-mvp-design.md
  anchor: data-models
---
**PostgreSQL table holding embedded, tenant-scoped PDF text chunks — the retrieval substrate for the agent's document Q&A tool.**

**Responsibilities**
- Stores per-document text chunks with their `1024`-dim embedding (from the TEI `bge-m3` sidecar).
- Serves ANN similarity search scoped to a single tenant per query.
- Is fully replaced (delete-and-replace) by the PDF Ingest Job whenever a source document changes.

**Contract / Interface**
- Table: `document_chunk` — one of the Core tables in Data Models (alongside `business`, `document`, `escalation`, etc.), all carrying `business_id` for tenant scoping.
- Index 1: `business_id` btree — every query is `WHERE business_id = :bid`-scoped.
- Index 2: HNSW cosine ANN index on `embedding`.
- Extension requirement: `pgvector >= 0.8` for iterative scans.

**Talks to**
- `PDF Ingest Job` `->` writes/replaces chunk rows at sync time.
- `LangGraph Agent` retrieval tool `<-` queried with the embedded customer question + `business_id` filter.
- `TEI Embeddings (bge-m3)` `->` source of the `embedding` column's vectors.

**Constraints & decisions**
- Risk: "pgvector index/scale at HNSW + tenant filter" can cause wrong/missing retrieval or slow ingestion at scale — mitigated by the `business_id` btree + HNSW cosine index pairing plus `pgvector >= 0.8`'s iterative scans, which keep recall acceptable when the HNSW scan is filtered by tenant.
- Constraint: cross-tenant leakage is a hard privacy/compliance line — `business_id` is injected via closure/`RunnableConfig`, never as an LLM-controllable argument, so every query stays tenant-scoped.
- Why pgvector over a dedicated vector DB: one shared PostgreSQL already carries the rest of the multi-tenant schema (Decision 2) — no second datastore to operate.
