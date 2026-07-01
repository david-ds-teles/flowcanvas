---
name: arq Job Queue (Redis)
description: Async job queue decoupling webhook ingest from agent processing
source:
  path: boards/msgflow-mvp-design.md
  anchor: sequence-inbound-message
---
**Redis-backed `arq` job queue that decouples the webhook ingest path from agent processing, so `POST /webhooks/zavu` can ACK zavu fast without waiting on the LLM/Google API roundtrip.**

**Responsibilities**
- Carries the `handle_inbound` job minted by the webhook route to the `arq` worker pool.
- Buffers load so a burst of inbound WhatsApp messages doesn't block the request path.
- Surfaces queue/Redis health on `/ready` so a broken queue fails fast instead of silently dropping work.

**Contract / Interface**
- Broker: `Redis` (Technology Stack: `Redis + arq` — "Process webhooks off the request path (ACK fast, work async)").
- Job: `handle_inbound` — enqueued by `POST /webhooks/zavu` right after the inbound message is upserted into Postgres; consumed by the `core.worker` arq worker.
- Reliability: `max_tries` + backoff + dead-letter logging on repeated job failure.
- Failure mode: enqueue failure returns `503` to zavu, which retries on its own.

**Talks to**
- Webhook handler (`POST /webhooks/zavu`) `->` enqueues `handle_inbound`.
- `arq Worker` `<-` dequeues and processes `handle_inbound`.
- `/ready` health endpoint `<-` reports Redis connectivity.

**Constraints & decisions**
- Risk: arq/Redis failure means "inbound accepted but never processed" — mitigated by `503` on enqueue failure (zavu retries) plus `max_tries`/backoff/dead-letter on the job.
- Decision: the webhook stays a thin, fast ACK — all LLM/Google-API work happens off-request in the worker, so `POST /webhooks/zavu` latency stays independent of agent/model latency.
- Idempotency: jobs must be idempotent since both zavu (webhook) and arq (job) retry — paired with `uq_message_wa_id` dedup at ingest.
