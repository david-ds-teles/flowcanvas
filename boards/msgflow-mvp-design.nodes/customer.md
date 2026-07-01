---
name: Customer
description: End customer messaging the business on WhatsApp
source:
  path: boards/msgflow-mvp-design.md
  anchor: problem-statement
---
**Customer** is the end user texting a connected business's WhatsApp number — the person every grounding rule and escalation path in msgflow exists to serve well.

**Responsibilities**
- Sends inbound WhatsApp messages asking recurring questions: business info, availability/agenda, service pricing, or general document-based Q&A.
- Returns over time as the same identity rather than a fresh stranger on every contact.
- Implicitly triggers escalation — a booking request, an unsupported ask, or a low-confidence case routes to the owner instead of getting an auto-reply.

**Contract / Interface**
- Inbound channel: free-form WhatsApp text via zavu.dev — no app, no API the customer calls directly.
- Identity key: phone number + captured WhatsApp profile name, matched on every inbound message (Decision 4 — build-contacts-over-time).
- Expected outcome: a **correct, grounded** reply within seconds, in the customer's own language (Success Criteria).

**Talks to**
- -> zavu.dev (WhatsApp BSP) for both inbound and outbound messaging
- <- msgflow agent reply, or silence once the conversation is `escalated` and the owner has taken over

**Constraints & decisions**
- Replies must be grounded in the business's own Google data — no hallucinated prices or hours; when the data doesn't cover the question, the system escalates instead of guessing (Success Criteria).
- Outside the 24-hour WhatsApp service window, msgflow cannot send the customer free-form text — only an approved template, or the send is dropped with a logged reason (Constraints & Risks).
- "Returning customer" recognition depends entirely on the phone-number contact upsert — there is no login or other identity proof.
