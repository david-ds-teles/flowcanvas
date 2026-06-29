---
name: arq-worker
kind: service
description: arq Worker — processes handle_inbound jobs; loads conversation state and dispatches the LangGraph agent.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: technical-design
---

# arq Worker

**Module:** `src/msgflow/core/worker.py`

Async arq worker process. The agent **never** runs on the HTTP request path — all slow work happens here.

**`handle_inbound` job flow:**
1. `SELECT … FOR UPDATE` on the inbound `message` row (idempotency lock).
2. If `message.intent IS NOT NULL` → duplicate, no-op, release lock.
3. Load `conversation` + recent `message` history from Postgres.
4. Check `conversation.status`: `ESCALATED` or `PAUSED` → skip auto-reply.
5. Bind per-business tools via closure — `business_id` injected, **never LLM-visible**:
   `check_availability`, `lookup_price`, `answer_from_documents`, `escalate_to_human`
6. Dispatch LangGraph agent with `AgentState`.
7. **REPLY decision:** check 24-h service window (`conversation.last_inbound_at`) → `send_text` (in-window) or `send_template(OUT_OF_WINDOW_TEMPLATE)` (out-of-window, or drop + log).
8. **ESCALATE decision:** create `escalation` row, set `conversation.status = 'ESCALATED'`, send owner notification via `OWNER_ESCALATION_TEMPLATE`.
9. Commit transaction: set `message.intent`, append outbound `message` row.
