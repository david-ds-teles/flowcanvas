---
name: langgraph-agent
kind: service
description: LangGraph Agent — the AI reasoning core; classifies intent, calls grounding tools, and decides reply vs escalate.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: module-boundaries
---

# LangGraph Agent

**Module:** `src/msgflow/agent/` — `graph.py`, `tools/` package, `state.py`, `llm.py`, `prompts.py`

Orchestrates tool-calling over a LangGraph state machine and produces a `FinalAnswer` structured output.

**Graph topology:**
```
classify → agent ⇄ tools → finalize → route → { reply | escalate }
```

- **classify:** fast intent classification. `booking_request` + `explicit_request` short-circuit directly to escalate.
- **agent ⇄ tools:** ReAct loop calling grounding tools until the model stops calling tools.
- **finalize:** `model.with_structured_output(FinalAnswer)` — forces self-reported `confidence (0.0–1.0)` + `reply_text | escalation_reason`. `ValidationError` → escalate with `low_confidence`.
- **route:** `confidence < LOW_CONFIDENCE_THRESHOLD (0.60)` → escalate; else → reply.

**Tool modules** (`agent/tools/` package, one module per tool + `_context.py`):

| Tool | Source | Returns |
|------|--------|---------|
| `check_availability(date_from, date_to)` | Calendar freebusy − business_hours | `list[AvailabilitySlot]` |
| `lookup_price(query?)` | Sheets rows | `list[PriceItem]` |
| `answer_from_documents(question)` | pgvector ANN + synthesis | `DocAnswer` |
| `escalate_to_human(reason, summary)` | Creates escalation, notifies owner | `EscalationResult` |

**Security:** `business_id` is injected into every tool via `RunnableConfig` / closure — never an LLM-supplied argument, preventing cross-tenant data access.
