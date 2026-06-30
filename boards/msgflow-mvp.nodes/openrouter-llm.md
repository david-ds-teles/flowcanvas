---
name: OpenRouter LLM Gateway
kind: external
description: OpenRouter — OpenAI-compatible LLM gateway for cheap, swappable model access.
source:
  path: boards/msgflow-mvp.md
  anchor: decision-3-llm--agent-orchestration
---

# OpenRouter LLM Gateway

OpenAI-compatible API gateway routing to multiple cheap model providers. msgflow uses it as the LLM backend for the LangGraph agent — no hand-rolled tool-calling loop.

**Config (pydantic-settings — never hardcoded):**

| Setting | Default | Role |
|---------|---------|------|
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Endpoint |
| `OPENROUTER_MODEL_AGENT` | `deepseek/deepseek-chat` | Primary tool-calling model |
| `OPENROUTER_MODEL_FALLBACK` | `openai/gpt-4o-mini` | Hard reasoning step |
| `OPENROUTER_MODEL_CLASSIFY` | `None` → reuses agent model | Intent classification |

**Integration:** wrapped by `LlmProvider` ABC. `OpenRouterProvider.chat_model()` returns `ChatOpenAI(base_url=..., model=..., temperature=0.0)`. LangGraph binds tools via `model.bind_tools(tools)`. Model ids are config — swappable without code changes.
