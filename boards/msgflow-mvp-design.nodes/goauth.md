---
name: Google OAuth (consent)
description: Per-business OAuth consent + token exchange
source:
  path: boards/msgflow-mvp-design.md
  anchor: scope
---
**The per-business Google OAuth flow that turns owner consent into the refresh/access tokens every other Google integration depends on.**

**Responsibilities**
- Builds the signed-state authorization URL and drives consent → code → token exchange for one business at a time.
- Persists the resulting tokens and flips the business to `active` once connected.

**Contract / Interface**
- `GET /oauth/google/start?business_id=` builds a signed-state auth URL with offline access + consent prompt (guarantees a refresh token even on re-consent) `->` 307 redirect to Google.
- `GET /oauth/google/callback` validates state, exchanges the code for refresh+access tokens, encrypts the refresh token via `core.crypto`, upserts `google_connection`, sets business `active`.
- Scopes requested: `calendar.freebusy`/`calendar.readonly`, `drive.file`, `sheets.readonly` — all non-restricted.

**Talks to**
- Business owner (browser) `->` initiates `/oauth/google/start`, approves the Google consent screen
- `google_connection` (db-tenancy) `<-` writes encrypted refresh/access tokens + granted scopes
- `core.crypto` `->` encrypts the refresh token before storage

**Constraints & decisions**
- Non-restricted scopes are chosen deliberately to skip Google's full security assessment, but this caps the app at a **100-user** OAuth consent-screen limit until the app is published/verified.
- Module boundary: `src/msgflow/api/routes/oauth_google.py` + `src/msgflow/google/oauth.py`.
- Mitigation: publish/verify the consent screen before broad onboarding, per Constraints & Risks.