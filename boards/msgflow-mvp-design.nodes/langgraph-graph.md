---
name: LangGraph Agent Graph
description: classify → agent ⇄ tools → finalize state graph
source:
  path: boards/msgflow-mvp-design.md
  anchor: architecture-decisions
---
**The per-turn decision engine — a typed LangGraph state graph that turns a loaded conversation into a structured reply/escalate decision.**

**Responsibilities**
- Loads conversation history for the turn and drives it through the state graph `classify -> agent ⇄ tools -> finalize`.
- `classify` short-circuits booking requests and explicit "talk to a human" asks straight to escalate, skipping tool calls entirely.
- `agent` binds the four grounding tools and loops with the model (tool call -> tool result -> model) until it has enough grounding to answer.
- `finalize` is the single structured-output decision point, setting `reply_text`, `confidence`, and `decision`.

**Contract / Interface**
- Full topology: `classify -> agent ⇄ tools -> finalize -> route -> {reply | escalate}`; code in `src/msgflow/agent/graph.py`, `state.py` (`AgentState`), `tools/` (4 tools), `llm.py` (`LlmProvider`), `prompts.py`.
- `agent` binds `check_availability`, `lookup_price`, `answer_from_documents`, `escalate_to_human` via `model.bind_tools(tools)`.
- `classify` calls `chat_model(model=OPENROUTER_MODEL_CLASSIFY)`; when unset, transparently reuses `OPENROUTER_MODEL_AGENT`.
- `AgentState` carries `business_id`, `conversation_id`, `retrieved_context`, `intent`, `confidence`, `decision`, `escalation_reason`, `reply_text`.

**Talks to**
- `arq worker (handle_inbound job)` -> invokes the graph after loading history from Postgres.
- `agent`/`tools` nodes <-> `OpenRouter LlmProvider` for chat completions and tool calls.
- `finalize` -> `Route: reply | escalate`, consumed by the worker to send or escalate.

**Constraints & decisions**
- Decision 3: LangGraph + OpenRouter over a hand-rolled tool loop — meets "easy, don't hand-roll tool-calling" at a fraction of Claude's cost.
- `business_id` is injected via closure/RunnableConfig into every tool call, never an LLM argument — prevents cross-tenant leakage (Constraints & Risks).