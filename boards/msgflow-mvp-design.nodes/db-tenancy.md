---
name: business / channel_credential / google_connection
description: Tenant root + per-business channel and Google OAuth config
source:
  path: boards/msgflow-mvp-design.md
  anchor: data-models
---
**The tenant-scoping core — three tables that anchor every business and the external credentials it owns.**

**Responsibilities**
- `business`: tenant root carrying status, owner phone, timezone, business hours — the row every other table's `business_id` points back to.
- `channel_credential`: per-business zavu config — encrypted API key + webhook secret.
- `google_connection`: per-business Google OAuth state — encrypted refresh/access tokens, granted scopes, `token_status`.

**Contract / Interface**
- Secrets (`api_key_encrypted`, `refresh_token_encrypted`) are AES-256-GCM envelope-encrypted in `core.crypto`, versioned via `secret_key_version` for rotation.
- `business_id` is carried on every domain table in the schema, not just these three — the design-wide tenant key.
- Module: `src/msgflow/tenancy` (`models.py`, `repository.py`, `resolver.py`) — also owns business resolution from inbound webhooks.

**Talks to**
- webhook-ingest `->` resolves the business via `channel_credential` at message intake
- goauth (`oauth_google` routes) `->` writes/updates `google_connection` on consent + token refresh
- gcal / gsheets / gdrive tools `<-` read tokens from `google_connection` to call Google APIs

**Constraints & decisions**
- KEK leak = full tenant credential compromise — mitigated by AES-256-GCM envelope encryption with the KEK sourced only from a secret manager/env, never the DB.
- Cross-tenant leakage risk: `business_id` is injected via closure/`RunnableConfig` into agent tools, never as an LLM-controllable argument; every query is tenant-scoped.
- `token_status` exists specifically to detect `RefreshError` and downgrade Google-dependent tools to escalate instead of failing silently.