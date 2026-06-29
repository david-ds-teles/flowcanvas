---
name: customer
kind: actor
description: Inbound WhatsApp customer — the end-user the system serves.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: problem-statement
---

# Customer

An end-customer who contacts a business via WhatsApp with recurring questions: availability, pricing, service info, or document Q&A.

**Identity:** built over time — keyed by E.164 phone number; `wa_profile_name` captured on first contact and stored in the `contact` table alongside conversation history.

**Language:** auto-detected from the conversation; replies are returned in the customer's own language (multilingual via bge-m3 + the LLM).

**Service window:** a free-form reply can only be sent within 24 h of the customer's last inbound message (`conversation.last_inbound_at`). Outside that window the system sends a pre-approved WhatsApp template or drops the reply with a logged reason.
