---
name: PostgreSQL + pgvector
kind: datastore
description: PostgreSQL + pgvector — shared multi-tenant datastore for all msgflow entities and PDF chunk embeddings.
source:
  path: boards/msgflow-mvp.md
  anchor: data-models
---

# PostgreSQL + pgvector

**Extensions:** `pgvector` (ANN similarity search), `pgcrypto` (`gen_random_uuid()`)  
**ORM:** SQLAlchemy async + asyncpg; migrations via Alembic. Shared `DeclarativeBase` in `src/msgflow/core/db.py`.

**Multi-tenancy:** every table carries `business_id UUID NOT NULL REFERENCES business(id)` and is always queried with an explicit `WHERE business_id = :bid` predicate.

**Key tables:**

| Table | Purpose |
|-------|---------|
| `business` | Tenant root — status, `owner_phone`, `business_hours` JSONB, `timezone` |
| `channel_credential` | zavu API key (encrypted), `wa_phone_number_id` routing key |
| `google_connection` | OAuth `refresh_token` + `access_token` (AES-256-GCM encrypted), token_status |
| `knowledge_source` | Drive folder / Sheet pointer, ingest status, config JSONB |
| `contact` | Customer built over time — phone (E.164) + `wa_profile_name` |
| `conversation` | Rolling thread per contact; `status: auto / escalated / paused` |
| `message` | Inbound + outbound; idempotent on `(business_id, wa_message_id)` |
| `document` | Drive PDF tracked for ingestion + change detection |
| `document_chunk` | Embedded text chunks; `embedding vector(1024)`, HNSW cosine index |
| `escalation` | Owner-notified hand-off records |

**Secret storage:** AES-256-GCM envelope encryption in `core.crypto`; KEK from env/secret manager; `secret_key_version` column supports rotation without a data migration.

**Index on embeddings:** `HNSW (embedding vector_cosine_ops)` with `m=16, ef_construction=64`; pgvector ≥ 0.8 iterative scans maintain recall under `business_id` filter.
