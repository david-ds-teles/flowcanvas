---
name: oauth-handler
kind: service
description: FastAPI routes — Google OAuth 2.0 onboarding for per-business Google Workspace access.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: api--interface-contracts
---

# FastAPI OAuth Handler

**Module:** `src/msgflow/api/routes/oauth_google.py` + `src/msgflow/google/oauth.py`

Manages the per-business Google OAuth 2.0 flow using a **stateless signed-state token** (no new table or Redis key needed).

**Endpoints:**
- `GET /oauth/google/start?business_id=<uuid>` — builds the authorization URL with `access_type=offline`, `prompt=consent`, and a signed-state token: `urlsafe_b64(AES-GCM-encrypt(json{business_id, nonce, iat}))`. 10-min TTL. Redirects 307 → Google consent.
- `GET /oauth/google/callback?code=&state=` — validates the state, exchanges code for `refresh_token + access_token`, encrypts both with `core.crypto` AES-256-GCM, upserts `google_connection`, sets `business.status = 'active'`.

**Granted scopes:** `openid`, `userinfo.email`, `calendar.freebusy`, `drive.file`, `sheets.readonly`

**Responses:** `OAuthResult` (200) | 400 on state mismatch | 502 on token-exchange failure.

**Token cache:** write-through — `access_token_encrypted + access_token_expires_at` stored; refreshed with 60-s expiry skew.
