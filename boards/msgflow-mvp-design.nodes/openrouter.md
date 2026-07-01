---
name: OpenRouter (LlmProvider)
description: Model gateway behind the LlmProvider abstraction
source:
  path: boards/msgflow-mvp-design.md
  anchor: architecture-decisions
---
**External OpenAI-compatible model gateway — the swappable LLM backbone behind msgflow's internal `LlmProvider` abstraction.**

**Responsibilities**
- Provides one endpoint to cheap, swappable models (DeepSeek, Qwen, GLM) instead of integrating each provider directly.
- Serves chat completions with tool-calling support that LangGraph's `agent` node binds its 4 grounding tools to.
- Allows per-step model selection — a cheap model for routine turns, a stronger fallback model for the hard reasoning step (`finalize`).

**Contract / Interface**
- Accessed only via `LlmProvider.chat_model(*, model: str | None, temperature: float = 0.0) -> BaseChatModel`, returning `ChatOpenAI(base_url=OPENROUTER_BASE_URL, api_key=..., model=...)` so LangGraph can `bind_tools(tools)`.
- `OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"`.
- Per-step model config: `OPENROUTER_MODEL_AGENT` (e.g. `deepseek/deepseek-chat`), `OPENROUTER_MODEL_FALLBACK` (e.g. `openai/gpt-4o-mini`, stronger reasoning), `OPENROUTER_MODEL_CLASSIFY` (`None` -> reuses the agent model) — pydantic-settings fields, never hardcoded.

**Talks to**
- `LangGraph Agent Graph` (`agent`/`finalize` nodes) -> calls `LlmProvider.chat_model()` for completions and tool binding.
- `core.config` -> supplies `OPENROUTER_MODEL_*` settings that select the model per call.

**Constraints & decisions**
- Decision 3: OpenRouter + LangGraph over a hand-rolled tool loop and over the Claude API — meets "easy, effective, don't hand-roll tool-calling" at a fraction of Claude's cost.
- Customer PII sent to a third-party model provider raises LGPD/GDPR disclosure obligations; the `LlmProvider` abstraction allows routing and minimum-context-sent mitigations, and PDF text stays on the self-hosted embeddings sidecar rather than being sent upstream (Constraints & Risks).