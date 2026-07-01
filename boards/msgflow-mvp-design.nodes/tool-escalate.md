---
name: escalate_to_human tool
description: Creates an escalation and notifies the owner
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-7-human-escalation
---
**The human-handoff tool — converts a turn the agent can't safely answer into an owner-visible escalation, with no admin UI involved.**

**Responsibilities**
- Inserts an `escalation` row recording why the turn was escalated (booking / unsupported / low confidence / explicit human request).
- Sets the conversation to `escalated` and pauses further auto-replies until the owner takes over.
- Notifies the business owner on WhatsApp with the conversation context plus a take-over prompt — the MVP's only "inbox" is WhatsApp itself.

**Contract / Interface**
- Tool signature: `escalate_to_human(reason: EscalationReason, summary: str) -> EscalationResult`, `EscalationResult { escalation_id: UUID, owner_notified: bool }`.
- `EscalationReason` enum: `booking_request`, `low_confidence`, `unsupported`, `explicit_request` — called from `classify` (short-circuit on `booking_request`/`explicit_request`) or post-`finalize` (`low_confidence`/`unsupported`).
- Persisted inline by the agent via a parameterized `text()` INSERT deriving `contact_id` from `conversation`; the worker owns the single commit.
- `business_id` is bound via closure/RunnableConfig to scope the `escalation` row — never an LLM-supplied argument.

**Talks to**
- `LangGraph Agent Graph` (`classify` or `finalize`/`Route: reply | escalate`) -> invokes this tool to hand off the turn.
- This tool -> `escalation` table (insert) and `conversation` table (status -> `escalated`).
- This tool -> zavu `ChannelAdapter` `send_template` -> business owner's WhatsApp number.

**Constraints & decisions**
- Decision 7: notify the owner on WhatsApp with a take-over prompt and pause auto-replies — explicitly no web UI/inbox for MVP.
- Owner escalation can fall outside any service window, where free-form text silently fails — mitigated by defaulting to a pre-approved utility template (Constraints & Risks).