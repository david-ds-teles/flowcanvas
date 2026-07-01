---
name: contact / conversation / message
description: Customer identity and conversation history
source:
  path: boards/msgflow-mvp-design.md
  anchor: data-models
---
**The customer-identity and conversation-history backbone that lets msgflow recognize a returning customer and maintain one rolling thread per contact.**

**Responsibilities**
- `contact`: built over time (Decision 4) — upserted on first inbound message, keyed by phone number and capturing the WhatsApp profile name; reused on every subsequent contact.
- `conversation`: one rolling thread per contact; status includes `escalated`; `last_inbound_at` drives the 24h service-window check before any outbound send.
- `message`: stores inbound/outbound text, deduped by `wa_message_id`.

**Contract / Interface**
- `message.wa_message_id` is enforced idempotent via the partial-unique index `uq_message_wa_id`.
- All three tables carry `business_id`; `contact` is effectively unique per `(business_id, phone)`.
- Module: `src/msgflow/contacts` (`models.py`, `repository.py`, `service.py`).

**Talks to**
- webhook-ingest `->` upserts `contact`, appends inbound `message`, on every webhook delivery
- arq-worker `->` reads conversation history + status, sets `conversation.status = escalated` on handoff
- db-escalation `<-` escalation rows reference a `conversation`

**Constraints & decisions**
- Idempotency is load-bearing: zavu retries on non-2xx/timeout, so without `uq_message_wa_id` + dedup-at-ingest, duplicate contacts/replies/escalations would result.
- Identity is explicitly build-over-time, not pre-registration — Decision 4 — so the first message from any phone number always creates a fresh contact.
- `last_inbound_at` gates whether a reply can go out as free-form text or needs an approved template, per the 24h service-window constraint.