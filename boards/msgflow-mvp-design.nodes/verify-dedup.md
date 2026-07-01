---
name: Verify Signature + Dedup
description: Inbound webhook guard — signature check and idempotency
source:
  path: boards/msgflow-mvp-design.md
  anchor: sequence-inbound-message
---
**Verify Signature + Dedup** is the guard inside Webhook Ingest that stops an untrusted or duplicate zavu retry from ever reaching the contact/message tables or the agent.

**Responsibilities**
- Verifies the inbound webhook's provider signature before any business-logic processing.
- Checks the inbound message's `wa_message_id` for a prior write and short-circuits duplicates.
- Guarantees the downstream `handle_inbound` arq job only does real work once per genuine customer message.

**Contract / Interface**
- Gate 1 — signature verification: reject the payload before it is parsed into business logic.
- Gate 2 — dedup key: `wa_message_id`, enforced at the database with the partial-unique index `uq_message_wa_id` on `message`.
- Idempotency: `handle_inbound` is itself an idempotent arq job, safe to re-run for the same `wa_message_id`.

**Talks to**
- <- Webhook Ingest (`POST /webhooks/zavu`) — runs first, before any contact/message write
- -> `message` table (Postgres) — uniqueness check via `uq_message_wa_id`
- -> arq enqueue — only reached once this gate passes

**Constraints & decisions**
- zavu retries on any non-2xx response or timeout, so duplicate delivery is the expected case, not the exception — this gate is the single chokepoint preventing duplicate contacts, duplicate replies, and double escalation (Constraints & Risks — Webhook idempotency).
- Dedup is enforced as a DB-level partial-unique constraint rather than an in-memory cache, so it holds across process restarts and multiple app instances.
- Pairing the dedup index with an idempotent `handle_inbound` job is deliberate belt-and-suspenders: even a duplicate that slips past the constraint race must not double-send or double-escalate when replayed.
