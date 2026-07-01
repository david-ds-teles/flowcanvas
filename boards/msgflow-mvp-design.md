---
name: msgflow-mvp-design
description: Design/PRD for msgflow MVP — an AI assistant that answers inbound WhatsApp customer messages grounded in a business's own Google Workspace data.
status: approved
tags: [design, architecture, whatsapp, ai-agent, google-workspace, multi-tenant]
links: [.flowcode/plans/plan-index.md, .flowcode/researches/whatsapp-connectivity-options-research.md, .flowcode/researches/google-workspace-integration-research.md]
source: /Users/davidteles/Projects/msgflow/.flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
---

# msgflow-mvp — WhatsApp AI Customer Assistant Design

- A business connects its WhatsApp number (via zavu.dev) and its Google Workspace; an AI agent identifies the customer and auto-answers business/availability/price/Q&A questions grounded in that business's own Google data, escalating bookings and low-confidence cases to the owner on WhatsApp.
- Scope — in: multi-tenant data + central FastAPI app, zavu channel adapter, build-contacts-over-time identity, per-business Google OAuth, LangGraph+OpenRouter agent with Calendar/Drive/Sheets grounding tools, hybrid automation. Out: appointment booking, billing/self-signup, proactive outbound, admin UI, extra channels.
- Key decisions: channel → zavu.dev behind an adapter; deployment → central multi-tenant app + shared Postgres; LLM → LangGraph + OpenRouter (model-agnostic); identity → build-over-time; calendar → read-only now; prices → Google Sheet; escalation → notify owner on WhatsApp.
- Stack: Python 3.12 · FastAPI · LangGraph · OpenRouter · PostgreSQL + pgvector · SQLAlchemy/Alembic · Pydantic v2 · Google API clients · Docker Compose.
- Status: approved; author human (scope) + designer-agent (technical depth); dated 2026-06-28. Implementation decisions made while writing the plan at full depth are recorded in § Resolved Implementation Decisions (2026-06-28) so this design and `msgflow-mvp-plan.md` stay in agreement.
- Sibling plan: `msgflow-mvp-plan.md` (created after this design is approved).

---

## Problem Statement

A business receives a steady stream of inbound WhatsApp messages from customers asking the same recurring questions: what the business does, when it is available (agenda), how much its services cost, and general document-based questions about the company. Answering these manually is slow, doesn't scale, and consumes the owner's time during and outside working hours.

Without msgflow, every inbound message needs a human to read it, look up the answer (in a calendar, a price list, or company documents), and reply — so response times are slow, the owner is constantly interrupted, and prospective customers go unanswered. msgflow removes that toil by auto-answering routine questions from the business's own source-of-truth data, while still routing anything that needs a human (a booking, an unusual request, a low-confidence answer) to the owner.

## Success Criteria

- A customer messaging a connected business's WhatsApp receives a **correct, grounded** reply (business info, availability, service price, or PDF-based Q&A) within seconds, in the customer's language.
- Replies are **grounded** in the business's own Google data — no hallucinated prices or hours. When the data does not cover the question, or the request is a booking / complex / low-confidence case, the bot **escalates to the owner on WhatsApp** and pauses auto-replies for that conversation.
- **Returning customers are recognized** — a contact record is built over time (phone + WhatsApp profile name + conversation history) and reused on the next contact.
- A **new business is onboarded without code changes**: connect zavu, complete Google OAuth, and point the system at the prices Sheet and the company-PDF Drive folder via configuration.
- **Low run cost**: zavu free tier (2,000 WhatsApp msgs/mo) + cheap models via OpenRouter ≈ pennies per conversation.
- Measurable targets to validate post-MVP: share of inbound messages resolved without escalation; grounding accuracy (answers traceable to source); median reply latency.

## Scope

**In scope:**

- Multi-tenant data model (`business_id` on every record) on a single shared PostgreSQL.
- A single central FastAPI application (multi-tenant) that ingests zavu webhooks and routes by business.
- **Channel adapter** abstraction with one concrete adapter: **zavu.dev** (inbound webhook ingest + outbound send).
- Customer identity via **build-contacts-over-time** (phone + WhatsApp profile name + conversation history).
- **Per-business Google OAuth** onboarding with securely stored refresh tokens. Minimal scopes: `calendar.freebusy`/`calendar.readonly`, `drive.file`, `sheets.readonly`.
- **AI agent** (LangGraph orchestration + OpenRouter model) with grounding tools: Calendar free/busy (availability), Drive-PDF Q&A (retrieval), price lookup (Google Sheet), and escalate-to-human.
- **Hybrid automation**: auto-reply for info/availability/price/Q&A; escalate bookings and low-confidence cases to the owner.

**Out of scope:**

- Appointment booking / Calendar write (deferred to a later phase; design leaves room for it).
- SaaS billing, subscriptions, and tenant self-signup.
- Proactive / marketing outbound messaging.
- A full admin web UI / inbox (escalation is WhatsApp-native, so the MVP is backend-only).
- Additional channels (Telegram, Email) — zavu supports them, but they are deferred.

## Solution Overview

msgflow is a backend service that sits between a business's WhatsApp (hosted by zavu.dev) and its Google Workspace. When a customer messages the business, zavu delivers the message to msgflow via webhook. msgflow resolves which business the message belongs to, upserts the customer contact and appends the message to the conversation, then hands the conversation to a LangGraph agent. The agent — running on a cheap, swappable model through OpenRouter — classifies the intent and calls grounding tools that read the business's own Google data (Calendar free/busy for availability, a designated Google Sheet for prices, and the business's company PDFs in Drive for document Q&A). It composes a grounded reply and, when confident, sends it back through zavu; when the request is a booking, is unsupported, or the agent's confidence is low, it escalates to the business owner on WhatsApp and pauses auto-replies for that conversation.

The architecture is deliberately **light and central**. Because zavu hosts the WhatsApp session, msgflow runs no stateful messaging process of its own — it is a stateless FastAPI app plus a shared multi-tenant PostgreSQL. That makes a single central deployment far cheaper to operate than one box per business, while a **channel adapter** interface and **config-driven per-business setup** keep the door open to (a) swapping zavu for the official Cloud API on a per-business basis if a number is ever at risk, and (b) peeling a heavy business onto its own deployment later. The LLM is held behind a provider abstraction so the model can be swapped (or upgraded for the hard reasoning step) without touching agent logic.

## Architecture Decisions

### Decision 1: WhatsApp channel

**Decision:** zavu.dev, accessed only through a `ChannelAdapter` interface so it is swappable.
**Rationale:** Lowest operational burden and cost for an MVP, official (low ban risk), and the adapter preserves the option to move a business to the Cloud API later without touching the core.

### Decision 2: Deployment topology

**Decision:** Central multi-tenant app + shared PostgreSQL; every record carries `business_id`.
**Rationale:** With zavu hosting the channel, the app is stateless and light, so a single central deployment is the least to operate while the shared DB already enforces tenant scoping.

### Decision 3: LLM / agent orchestration

**Decision:** LangGraph for orchestration, OpenRouter as the model gateway, behind an internal `LlmProvider` abstraction.
**Rationale:** Meets the owner's "easy and effective, don't hand-roll tool-calling" requirement at a fraction of Claude's cost; the abstraction allows per-step model selection and a stronger fallback for the hard reasoning step.

### Decision 4: Customer identity

**Decision:** Build contacts over time — on first inbound message, upsert a contact keyed by phone number, capture the WhatsApp profile name, and accumulate conversation history; reuse on return.

### Decision 5: Calendar capability

**Decision:** Read-only availability now (Calendar free/busy); appointment booking (Calendar write) deferred to a later phase.

### Decision 6: Price source

**Decision:** A designated **Google Sheet** is the canonical price source, read via the Sheets API (`sheets.readonly`).

### Decision 7: Human escalation

**Decision:** Notify the owner on WhatsApp with the conversation + a take-over prompt, and pause auto-replies for that conversation (no web UI).

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Language | Python 3.12+ | Best ecosystem for LLM/agent + Google API clients + PDF parsing |
| Web / API | FastAPI + Uvicorn | Async webhook ingestion; clean typing with Pydantic |
| Agent orchestration | LangGraph (+ langchain-core) | Manages the tool-calling loop and conversation state |
| LLM gateway | OpenRouter (OpenAI-compatible) | One endpoint to cheap, swappable models (DeepSeek/Qwen/GLM) |
| WhatsApp channel | zavu.dev (hosted) | Official, free tier, multi-channel; behind a channel adapter |
| Database | PostgreSQL + pgvector | Shared multi-tenant store; pgvector for PDF-chunk embeddings |
| ORM / migrations | SQLAlchemy (async, asyncpg) + Alembic | Typed data access and versioned schema |
| Models / validation | Pydantic v2 + pydantic-settings | Typed DTOs and env-driven config |
| Google APIs | google-api-python-client, google-auth-oauthlib | Calendar, Drive, Sheets access |
| PDF extraction | pypdf (fallback pdfplumber) | Drive PDF bytes to text before retrieval |
| Async jobs | Redis + arq | Process webhooks off the request path (ACK fast, work async) |
| Packaging | uv | Fast, modern Python dependency management |
| Container | Docker + Docker Compose | App + Postgres + Redis as one deployable stack |
| Testing | pytest + pytest-asyncio + httpx | Unit and API tests |
| Quality | Ruff + mypy | Lint/format and static typing |

## Technical Design

### Data Models

All domain tables carry `business_id` for tenant scoping. Core tables: `business`, `channel_credential`, `google_connection`, `knowledge_source`, `contact`, `conversation`, `message`, `document`, `document_chunk` (pgvector HNSW), `escalation`. Secrets (`api_key_encrypted`, `refresh_token_encrypted`) are AES-256-GCM envelope-encrypted in `core.crypto` with `secret_key_version` for rotation. Forward-compatible `appointment` table (not created in MVP) is purely additive for later Calendar-write booking.

### Module Boundaries

Greenfield package layout under `src/msgflow/`:

| Package | Responsibility | Key modules |
|---------|----------------|-------------|
| `src/msgflow/api` | FastAPI app, routers, dependency wiring | `app.py`, `routes/webhooks_zavu.py`, `routes/oauth_google.py`, `routes/health.py` |
| `src/msgflow/channel` | `ChannelAdapter` ABC + zavu adapter + DTOs | `base.py`, `zavu.py`, `dto.py`, `registry.py` |
| `src/msgflow/agent` | LangGraph graph, tools, `LlmProvider`, state, prompts | `graph.py`, `tools/`, `state.py`, `llm.py`, `prompts.py` |
| `src/msgflow/google` | OAuth flow + per-business `GoogleClient` (calendar/drive/sheets) + token lifecycle | `oauth.py`, `client.py`, `calendar.py`, `drive.py`, `sheets.py` |
| `src/msgflow/knowledge` | PDF ingest, chunking, embeddings, retrieval, price lookup | `ingest.py`, `chunk.py`, `embeddings.py`, `retrieval.py`, `prices.py`, `dto.py` |
| `src/msgflow/contacts` | Contact / conversation / message models, repos, service | `models.py`, `repository.py`, `service.py` |
| `src/msgflow/tenancy` | Business, channel_credential, google_connection, knowledge_source models/repos + business resolution | `models.py`, `repository.py`, `resolver.py` |
| `src/msgflow/core` | Settings, async DB session, secret crypto, arq queue/worker, logging | `config.py`, `db.py`, `crypto.py`, `queue.py`, `worker.py`, `logging.py` |

### Sequence — Inbound message

Customer sends WhatsApp message → zavu BSP → `POST /webhooks/zavu` (FastAPI) verifies signature + dedups `wa_message_id` → resolves business by `phone_number_id` → upserts contact + appends inbound message in Postgres → enqueues `handle_inbound` job on Redis/arq → returns 200 to zavu. The arq worker loads conversation history, classifies intent, binds per-business tools, calls Google APIs (freebusy / Sheets / Drive retrieval), composes a grounded reply and scores confidence. If confident and within the 24h service window, it sends the reply via zavu and logs the outbound message. Otherwise (booking, unsupported, or low confidence) it creates an escalation, sets the conversation to `escalated`, and notifies the owner on WhatsApp.

### Sequence — Per-business Google OAuth onboarding

Owner clicks "connect Google" in the browser → `GET /oauth/google/start?business_id=` builds a signed-state authorization URL (offline access, consent prompt) → 307 redirect to Google consent → owner approves the minimal scopes (freebusy, drive.file, sheets.readonly) → Google redirects to `GET /oauth/google/callback` with code+state → API validates state, exchanges the code for refresh+access tokens, encrypts the refresh token via `core.crypto`, upserts `google_connection`, and sets the business `active`.

## Constraints & Risks

| Constraint / Risk | Impact | Mitigation |
|-------------------|--------|-----------|
| Webhook idempotency — zavu retries on non-2xx / timeout | Duplicate contacts, duplicate replies, double escalation | Partial-unique `uq_message_wa_id`; dedup at ingest; idempotent arq job |
| 24-hour service window | Delayed/late reply cannot be sent as plain text | Check `last_inbound_at` before `send_text`; outside window → approved template or drop with logged reason |
| Owner escalation can fall outside any service window | Escalation notification can silently fail as free-form text | Send via a pre-approved utility template by default |
| Cheap models vary on tool-calling reliability | Agent may mis-call tools or mis-escalate | Configurable `OPENROUTER_MODEL_*`; structured-output guard; stronger fallback model |
| arq / Redis failure | Inbound accepted but never processed | 503 on enqueue failure (zavu retries); `max_tries` + backoff + dead-letter; `/ready` reports Redis health |
| pgvector index / scale at HNSW + tenant filter | Wrong/missing retrieval; slow ingestion at scale | `business_id` btree + HNSW cosine index; pgvector >= 0.8 iterative scans |
| Secret-encryption key management | KEK leak = full tenant credential compromise | AES-256-GCM envelope encryption; KEK from secret manager/env only; `secret_key_version` rotation |
| Cross-tenant data leakage | Privacy/compliance breach | `business_id` injected via closure/RunnableConfig, never an LLM argument; every query tenant-scoped |
| zavu WhatsApp delivery must stay official | Channel reliability / account safety | Confirmed official Meta BSP; adapter still allows swap to Cloud API |
| Google OAuth consent-screen verification | "Unverified app" warning + 100-user cap | Non-restricted scopes avoid security assessment; publish/verify before broad onboarding |
| Customer PII sent to third-party model provider | LGPD/GDPR disclosure obligations | `LlmProvider` abstraction allows routing; minimum context sent; PDF text stays on self-hosted embeddings sidecar |
| Refresh-token expiry | Grounding tools fail for that business | Detect `RefreshError`, set `token_status`; notify owner to re-auth; degrade to escalate |

**Full design source:** `/Users/davidteles/Projects/msgflow/.flowcode/plans/msgflow-mvp/msgflow-mvp-design.md` (this file is a flowcanvas-local copy for the agent-generated board's core spine — see also `msgflow-mvp-plan.md` in the same source directory for the phased implementation plan).
