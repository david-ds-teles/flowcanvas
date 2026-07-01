---
name: Webhook Ingest (FastAPI)
description: POST /webhooks/zavu — ingests inbound WhatsApp messages
source:
  path: boards/msgflow-mvp-design.md
  anchor: sequence-inbound-message
---
**Webhook Ingest** is the FastAPI route that receives every inbound WhatsApp event from zavu — the only place a message enters msgflow's data model.

**Responsibilities**
- Receives the zavu webhook POST and verifies the provider signature before any further processing.
- Resolves which business the message belongs to and persists it (contact + message) in Postgres.
- Hands the message off to async processing and acknowledges the provider fast.

**Contract / Interface**
- Route: `POST /webhooks/zavu`.
- Business resolution: by `phone_number_id` -> `business` (multi-tenant lookup).
- Writes: upserts `contact`, appends inbound `message` row, both `business_id`-scoped.
- Enqueues: `handle_inbound` job on Redis/arq.
- Responses: `200` to ACK acceptance; `503` if enqueue fails.

**Talks to**
- <- zavu.dev (webhook delivery)
- -> Postgres (asyncpg) — contact + message upsert
- -> Redis/arq — enqueue `handle_inbound`
- -> arq worker (downstream, off the request path) — runs the actual agent

**Constraints & decisions**
- The agent never runs on the request path — ingest only persists and enqueues, keeping webhook latency low and zavu's retry budget unspent waiting on an LLM call (Sequence — Inbound message).
- `503` on enqueue failure is deliberate: it tells zavu to retry rather than silently accepting a message that never gets queued (Constraints & Risks — arq/Redis failure).
- Webhook idempotency is a named risk — zavu retries on non-2xx/timeout, which can otherwise produce duplicate contacts, duplicate replies, or double escalation; ingest is the boundary that must run signature verification + dedup before any write (Constraints & Risks).
