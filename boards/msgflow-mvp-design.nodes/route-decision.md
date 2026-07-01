---
name: 'Route: reply | escalate'
description: Finalize's structured-output decision point
source:
  path: boards/msgflow-mvp-design.md
  anchor: architecture-decisions
---
**The branch point of the agent turn — `finalize`'s structured-output decision between auto-reply and human handoff.**

**Responsibilities**
- Evaluates `finalize`'s structured output (`reply_text`, `confidence`, `decision`) against the service-window and confidence gates.
- Picks `reply` only when the model is confident AND the conversation is within the 24h service window.
- Routes everything else — bookings, unsupported requests, low-confidence answers, late conversations — to `escalate`.

**Contract / Interface**
- `finalize` calls `with_structured_output(FinalAnswer)`; the model self-reports a calibrated `confidence`. A `ValidationError` on that call collapses straight to `escalate(low_confidence)`.
- `decision: reply` requires `confidence >= LOW_CONFIDENCE_THRESHOLD` (`0.60`) AND the turn inside `SERVICE_WINDOW_HOURS` (`24`), checked against `conversation.last_inbound_at`.
- `answer_from_documents` floors `confidence` to `0.0` on empty retrieval, which deterministically fails the threshold check.
- On `reply`, the worker sends `reply_text` via the channel adapter's `send_text`; on `escalate`, control passes to `escalate_to_human`.

**Talks to**
- `LangGraph Agent Graph` (`finalize` node) -> produces the decision this node evaluates.
- `reply` branch -> `arq worker` -> zavu channel adapter `send_text`.
- `escalate` branch -> `escalate_to_human tool`.

**Constraints & decisions**
- 24-hour service window (Constraints & Risks): a late reply cannot be sent as plain text — outside the window it must use an approved template or be dropped with a logged reason, so `finalize` cannot blindly trust confidence alone.
- Cheap OpenRouter models vary on tool-calling/reasoning reliability — a structured-output guard plus a stronger fallback model backs this gate (Constraints & Risks, Decision 3).