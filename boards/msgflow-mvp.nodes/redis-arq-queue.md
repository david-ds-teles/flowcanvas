---
name: redis-arq-queue
kind: queue
description: Redis-backed arq job queue — async decoupling between webhook ingestion and the agent worker.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: technology-stack
---

# Redis / arq Queue

**Module:** `src/msgflow/core/queue.py`

Async job broker built on Redis via the `arq` library. Decouples the fast HTTP ACK from the slow LLM + Google API work.

**Jobs enqueued:**
- `handle_inbound(business_id, conversation_id, message_id)` — by the webhook handler for each new inbound message.
- `ingest_knowledge(business_id, knowledge_source_id)` — by arq's cron scheduler (daily) for each `pdf_drive_folder` source.

**Reliability contract:**
- Webhook returns **503** on enqueue failure → zavu retries (never silently drop a message).
- arq `max_tries` with exponential backoff; dead-letter logging on final failure.
- Jobs are idempotent: `message.intent IS NOT NULL` is the processed-anchor; `SELECT … FOR UPDATE` prevents concurrent double-processing.

**Health:** `/ready` endpoint reports Redis reachability (returns 503 if down).
