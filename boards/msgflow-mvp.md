---
name: msgflow-mvp
description: msgflow MVP — WhatsApp AI customer assistant with Google Workspace grounding. Living system spec for the Flowcanvas board.
tags: [msgflow, system-design, whatsapp, ai-agent, google-workspace, multi-tenant]
---

# msgflow MVP — System Design

A backend service that sits between a business's WhatsApp (via zavu.dev) and its Google Workspace. An AI agent auto-answers routine customer questions grounded in the business's own data and escalates to the owner when needed.

**Stack:** Python 3.12 · FastAPI · LangGraph · OpenRouter · PostgreSQL + pgvector · Redis + arq · Docker Compose.

## Problem Statement

A business receives recurring inbound WhatsApp messages asking about availability, pricing, and services. Answering manually is slow and interrupts the owner. msgflow auto-answers routine questions from the business's own Google Workspace data (Calendar, Drive PDFs, Sheets) and escalates bookings and low-confidence cases to the owner on WhatsApp.

## Solution Overview

msgflow is a stateless multi-tenant FastAPI application behind a hosted WhatsApp channel (zavu.dev). Inbound messages are ACK'd fast (HTTP), dequeued by an arq worker, and processed by a LangGraph agent with grounding tools against the business's Google Calendar, Drive PDFs, and Sheets. Auto-replies go out via zavu; uncertain cases escalate to the owner's WhatsApp.

Central multi-tenant deployment: shared PostgreSQL with `business_id` scoping on every table, plus a local TEI embeddings sidecar for zero-cost multilingual PDF retrieval.

## Architecture Decisions

### Decision 1: WhatsApp Channel

**Chosen:** zavu.dev (official Meta BSP, free tier 2k msgs/mo). Zero ban risk. Accessed only via `ChannelAdapter` ABC — swappable to Meta Cloud API per-business without touching the core.

### Decision 3: LLM / Agent Orchestration

**Chosen:** LangGraph + OpenRouter (model-agnostic gateway). OpenAI-compatible; models are config (`OPENROUTER_MODEL_AGENT`, `OPENROUTER_MODEL_FALLBACK`, `OPENROUTER_MODEL_CLASSIFY`). `LlmProvider` ABC wraps the gateway. No hand-rolled tool-calling loop.

### Decision 5: Calendar Capability

**Chosen:** Read-only `calendar.freebusy` (availability without event details). Appointment booking (`calendar.events` write) deferred — additive migration path preserved.

### Decision 6: Price Source

**Chosen:** Google Sheet (`sheets.readonly`). Owner-maintainable, robust, trivially read via `read_prices_sheet`. Google Forms rejected (stores responses, not a price list).

### Decision 7: Human Escalation

**Chosen:** Owner notification via WhatsApp (pre-approved `OWNER_ESCALATION_TEMPLATE`) + conversation pause. No web inbox in MVP. Owner replies from their own WhatsApp, opening a 24h service window.

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Web / API | FastAPI + Uvicorn | Async webhook ingestion; Pydantic v2 bodies |
| Agent | LangGraph + langchain-core | Tool-calling loop + conversation state |
| LLM Gateway | OpenRouter (OpenAI-compat) | Cheap swappable models; `LlmProvider` ABC |
| Channel | zavu.dev via `ChannelAdapter` | Official BSP; behind a swappable adapter |
| Database | PostgreSQL + pgvector | Multi-tenant; HNSW cosine ANN index |
| ORM | SQLAlchemy async + asyncpg + Alembic | Typed models; versioned migrations |
| Job Queue | Redis + arq | Fast ACK → async worker processing |
| Embeddings | BAAI/bge-m3 via TEI sidecar | Multilingual, 1024-dim, zero per-call cost |
| Google APIs | google-api-python-client + google-auth-oauthlib | Calendar, Drive, Sheets |
| PDF | pypdf + pdfplumber fallback | Text extraction for Drive PDFs |
| Packaging | uv + Docker Compose | App + Postgres + Redis + TEI sidecar |

## Technical Design

**Inbound flow:**
1. zavu → `POST /webhooks/zavu` → signature verify → upsert contact + message → enqueue arq job → 200 ACK
2. arq worker → load conversation → check status → bind per-business tools → LangGraph agent
3. Agent: `classify → agent ⇄ tools → finalize → route → { reply | escalate }`
4. REPLY: `confidence ≥ 0.60` and `status=AUTO` → `send_text` (in 24h window) or template (out-of-window)
5. ESCALATE: `booking/low_confidence/unsupported/explicit_request` → create `escalation` → notify owner via template

**Idempotency:** partial-unique `uq_message_wa_id (business_id, wa_message_id)`; arq job anchored on `message.intent IS NOT NULL`.

**Secret storage:** AES-256-GCM envelope encryption (`core.crypto`), KEK from env; `secret_key_version` supports rotation.

## API & Interface Contracts

**HTTP routes:**
- `POST /webhooks/zavu` — inbound message ingestion (signature verify → upsert → enqueue → 200 `WebhookAck`)
- `GET /webhooks/zavu` — provider verification handshake
- `GET /oauth/google/start` — 307 redirect to Google consent (stateless signed-state token, 10-min TTL)
- `GET /oauth/google/callback` — code exchange → encrypt + store refresh token → `business.status=active`
- `GET /health` / `GET /ready` — liveness / readiness (DB + Redis + embeddings)

**`ChannelAdapter` ABC:** `verify_webhook`, `parse_inbound`, `resolve_business`, `send_text`, `send_template`

**`LlmProvider` ABC:** `chat_model(model?, temperature) → BaseChatModel` (LangChain; tools bound via `model.bind_tools`)

**Agent tools** (business_id injected via closure — never LLM-visible):
- `check_availability(date_from, date_to)` → `list[AvailabilitySlot]`
- `lookup_price(query?)` → `list[PriceItem]`
- `answer_from_documents(question)` → `DocAnswer`
- `escalate_to_human(reason, summary)` → `EscalationResult`

## Data Models

All tables carry `business_id UUID NOT NULL` (tenant scoping). Primary keys: `gen_random_uuid()`. Secret fields: `BYTEA` AES-256-GCM ciphertext.

**Core tables:** `business` (tenant root), `channel_credential` (zavu API key + `wa_phone_number_id` routing), `google_connection` (OAuth tokens, encrypted), `knowledge_source` (Drive folder / Sheet pointer), `contact` (customer identity — phone + `wa_profile_name`), `conversation` (rolling thread; `status: auto/escalated/paused`), `message` (inbound+outbound; idempotent on `wa_message_id`), `document` (Drive PDF), `document_chunk` (embedded text; `vector(1024)` HNSW cosine index), `escalation` (owner hand-off records).

**Enums (Python `StrEnum`, native Postgres enum):** `BusinessStatus`, `ChannelProvider`, `GoogleTokenStatus`, `KnowledgeSourceKind`, `DocumentIngestStatus`, `ConversationStatus`, `MessageDirection`, `MessageStatus`, `AgentIntent`, `EscalationReason`, `EscalationStatus`.

## Module Boundaries

| Package | Responsibility |
|---------|----------------|
| `src/msgflow/api` | FastAPI app, routers (`webhooks_zavu`, `oauth_google`, `health`) |
| `src/msgflow/channel` | `ChannelAdapter` ABC + `ZavuAdapter` + DTOs |
| `src/msgflow/agent` | LangGraph graph, tools package, `LlmProvider`, state, prompts |
| `src/msgflow/google` | OAuth flow + per-business `GoogleClient` (calendar/drive/sheets) |
| `src/msgflow/knowledge` | PDF ingest, chunking, `EmbeddingProvider`, retrieval, prices |
| `src/msgflow/contacts` | Contact / conversation / message models, repos, service |
| `src/msgflow/tenancy` | Business, channel_credential, google_connection, knowledge_source + resolver |
| `src/msgflow/core` | Settings, async DB, crypto, arq queue/worker, logging |

## Retrieval & Knowledge Ingestion (RAG)

**Model:** `BAAI/bge-m3` (1024-dim, multilingual) served by a local HuggingFace TEI sidecar (`http://embeddings:80`). No per-call cost; customer documents stay on the host.

**Ingestion pipeline (daily arq cron + on-demand):**
1. `list_drive_pdfs(folder_id)` → compare `drive_modified_time`/`checksum` → skip unchanged files
2. Download PDF → `pypdf` text (fallback `pdfplumber` when text empty or char ratio < 0.60)
3. tiktoken `cl100k_base` chunk at 512 tokens / 64 overlap
4. Batch-embed 32 inputs/req via TEI → delete-replace `document_chunk` rows → `ingest_status='ready'`

**Query time (`answer_from_documents`):**
- Embed question → ANN: `SELECT … WHERE business_id=:bid ORDER BY embedding <=> :q LIMIT 5`
- Drop chunks below `RETRIEVAL_MIN_COSINE=0.30` → empty result → `confidence=0.0` → escalate

**Prices (Google Sheet):** `read_prices_sheet(spreadsheet_id, range_a1)` → rows mapped to `PriceItem {name, price, unit, notes}`; shape configured in `knowledge_source.config` JSONB.
