---
name: arq Worker — Agent Runtime
description: Background worker that runs the agent and sends replies
source:
  path: boards/msgflow-mvp-design.md
  anchor: sequence-inbound-message
---
**The `arq` background worker that executes the `handle_inbound` job — loads context, runs the LangGraph agent, and either sends the grounded reply or escalates to the owner, entirely off the request path.**

**Responsibilities**
- Loads conversation history and status for the inbound message's `conversation`.
- Classifies intent and invokes the LangGraph agent with per-business bound grounding tools.
- Sends the reply via the zavu channel adapter when confident and within the 24h service window, or creates an `escalation` row and notifies the owner otherwise.
- Owns the single commit that marks the inbound message processed — the idempotency boundary.

**Contract / Interface**
- Module: `src/msgflow/core/worker.py` (`core` package owns `queue.py`/`worker.py` per Module Boundaries).
- Job consumed: `handle_inbound`, dequeued from the `arq Job Queue`.
- Decision gate: confident + within 24h window `->` `send_text` via the `ChannelAdapter`; booking / unsupported / low-confidence `->` create `escalation`, set conversation `escalated`, notify owner on WhatsApp via a pre-approved utility template.
- Tools bound per business: Calendar free/busy, Sheets price lookup, Drive-PDF retrieval (`src/msgflow/agent/tools/`).

**Talks to**
- `arq Job Queue (Redis)` `<-` dequeues `handle_inbound`.
- `LangGraph Agent` `->` invokes with conversation state + bound tools.
- `zavu Channel Adapter` `->` sends the outbound reply or escalation notice.
- `escalation` (Postgres) `->` written when the agent escalates.

**Constraints & decisions**
- Constraint: the 24-hour service window means a late reply cannot go out as plain text — the worker checks `last_inbound_at` before `send_text` and falls back to an approved template (or drops + logs) outside the window.
- Risk: escalation notifications can themselves fall outside the service window — mitigated by sending via a pre-approved utility template by default.
- Decision: runs entirely off the request path via arq so agent/model latency never blocks the webhook ACK.
