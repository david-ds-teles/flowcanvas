---
name: Business Owner
description: Receives escalations and completes Google OAuth onboarding
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-7-human-escalation
---
**Business Owner** is the one human in the loop per tenant — onboards the business once, then steps in only when the agent hands a conversation off.

**Responsibilities**
- Performs one-time per-business Google OAuth onboarding after connecting zavu.
- Maintains the canonical price source (Google Sheet) and the company-PDF Drive folder the agent retrieves from.
- Receives escalation notifications on their own WhatsApp and takes the conversation over directly.

**Contract / Interface**
- Onboarding entry point: `GET /oauth/google/start?business_id=` -> Google consent (offline access, consent prompt) -> `GET /oauth/google/callback`.
- Scopes granted on consent: `calendar.freebusy`/`calendar.readonly`, `drive.file`, `sheets.readonly` (Decision 5, Decision 6, Scope).
- Escalation delivery: conversation history + a take-over prompt, sent via WhatsApp (Decision 7).
- Outcome of onboarding: `google_connection` upserted, business marked `active`.

**Talks to**
- -> `/oauth/google/start` and `/oauth/google/callback` (browser, one-time)
- <- escalation notification via zavu.dev (WhatsApp)
- -> Google Sheet (prices) and Drive PDF folder, maintained out-of-band via Google Workspace, not through msgflow

**Constraints & decisions**
- Escalation pauses auto-replies for that conversation entirely — the agent stays silent until the owner resolves it (Decision 7: notify + pause, no web UI).
- Escalation notifications default to a pre-approved utility template because the owner-facing message can itself fall outside the 24h service window (Constraints & Risks).
- Onboarding is config-driven, not code-driven: connect zavu, complete Google OAuth, point at the prices Sheet and PDF folder — a new business goes live with no deploy (Success Criteria).
