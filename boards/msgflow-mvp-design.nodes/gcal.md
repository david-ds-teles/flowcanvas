---
name: Google Calendar (freebusy)
description: Read-only availability source
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-5-calendar-capability
---
**Read-only Google Calendar source that exposes per-business availability without ever exposing event content.**

**Responsibilities**
- Answers "is this business free at time X" for the agent's availability questions, never event titles/attendees.
- Sole grounding source for availability, alongside gsheets (price) and gdrive (Q&A) as the three retrieval tools.

**Contract / Interface**
- Queried via the Calendar API's `freebusy.query` method.
- OAuth scopes: `calendar.freebusy` / `calendar.readonly` — both non-restricted.
- Invoked by the `check_availability` agent tool, authenticated with the business's stored `google_connection` token.

**Talks to**
- `check_availability` tool `->` calls `freebusy.query`
- `google_connection` `<-` supplies the encrypted access/refresh token used to authenticate
- LangGraph agent `->` routes here when intent classifies as an availability question

**Constraints & decisions**
- Decision 5: read-only now; Calendar **write** (appointment booking) is explicitly deferred to a later phase — the forward-compatible `appointment` table exists in the design but is not created in MVP.
- Non-restricted scope choice avoids Google's consent-screen security assessment, keeping onboarding self-serve.
- Risk: refresh-token expiry breaks this tool per-business — mitigated by detecting `RefreshError`, setting `token_status`, and degrading to escalate.