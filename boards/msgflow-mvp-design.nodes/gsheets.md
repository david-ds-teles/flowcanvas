---
name: Google Sheets (prices)
description: Canonical price list, read via Sheets API
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-6-price-source
---
**The owner-maintained Google Sheet that is the single canonical source of truth for a business's service prices.**

**Responsibilities**
- Holds the live price list per business — edits by the owner take effect with no redeploy or sync step.
- Backs the `lookup_price` tool's grounded answers so the agent never invents a price.

**Contract / Interface**
- Read via the Sheets API `values.get` against a per-business designated Sheet.
- OAuth scope: `sheets.readonly` (non-restricted).
- Read by the `lookup_price` agent tool, authenticated with the business's `google_connection` token.

**Talks to**
- `lookup_price` tool `->` calls Sheets API `values.get`
- `google_connection` `<-` supplies the access/refresh token for the call
- LangGraph agent `->` routes here when intent classifies as a price inquiry

**Constraints & decisions**
- Decision 6: a designated Sheet — not a DB table — is canonical, trading a live external call per price question for owner-editable pricing with zero engineering involvement.
- Non-restricted `sheets.readonly` scope avoids Google's security review, same rationale as Calendar/Drive.
- Same refresh-token-expiry risk as the other Google sources: detect `RefreshError`, mark `token_status`, escalate rather than guess a price.