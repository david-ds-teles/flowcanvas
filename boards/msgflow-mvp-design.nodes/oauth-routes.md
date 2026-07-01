---
name: OAuth Routes (FastAPI)
description: Per-business Google OAuth consent + callback routes
source:
  path: boards/msgflow-mvp-design.md
  anchor: sequence-per-business-google-oauth-onboarding
---
**OAuth Routes** is the FastAPI pair that performs one-time, per-business Google Workspace authorization, turning a business from "connected to zavu" into `active` with grounding tools available.

**Responsibilities**
- Builds the Google consent URL for a specific business and redirects the owner's browser to it.
- Validates the returning state and exchanges the authorization code for tokens.
- Persists the encrypted refresh token and activates the business.

**Contract / Interface**
- `GET /oauth/google/start?business_id=` -> builds a signed-state, offline-access, consent-prompt authorization URL -> `307` redirect to Google.
- `GET /oauth/google/callback` (code + state) -> validates `state`, exchanges `code` for refresh + access tokens.
- Token handling: refresh token AES-256-GCM-encrypted via `core.crypto` before storage.
- Persistence: upserts `google_connection`; sets the business `active`.
- Scopes requested: `calendar.freebusy`/`calendar.readonly`, `drive.file`, `sheets.readonly` — minimal, non-restricted (Scope, Decision 5, Decision 6).

**Talks to**
- <- Business Owner (browser, one-time)
- -> Google OAuth consent + token endpoints
- -> `core.crypto` for refresh-token encryption
- -> Postgres — `google_connection` upsert, business activation

**Constraints & decisions**
- State is signed, not a bare random token, so the callback can verify the redirect wasn't tampered with and route it back to the correct `business_id`.
- Minimal/non-restricted scopes are a deliberate choice to avoid Google's security-assessment requirement, at the cost of a 100-user cap and an "unverified app" warning until the app is published/verified (Constraints & Risks — Google OAuth consent-screen verification).
- Refresh-token expiry is a named risk: msgflow must detect `RefreshError`, set `token_status`, notify the owner to re-auth, and degrade to escalate rather than fail silently (Constraints & Risks — Refresh-token expiry).
- This route pair is what makes onboarding config-driven and code-free — connect zavu, complete this OAuth flow, point at the Sheet/Drive folder, and the business is live (Success Criteria).
