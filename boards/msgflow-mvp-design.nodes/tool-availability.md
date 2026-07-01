---
name: check_availability tool
description: Calendar free/busy availability tool
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-5-calendar-capability
---
**A LangGraph grounding tool that answers "when is the business available" by reading the business's own Google Calendar — never writes to it.**

**Responsibilities**
- Calls Google Calendar's `freebusy.query` for the connected business's calendar to fetch busy blocks.
- Derives free windows by subtracting those busy blocks from business hours, for the agent to quote back to the customer.
- Stays strictly read-only — appointment booking (Calendar write) is explicitly deferred to a later phase (Decision 5).

**Contract / Interface**
- Tool signature (as bound for the model): `check_availability(date_from: date, date_to: date) -> list[AvailabilitySlot]`, `AvailabilitySlot { start: datetime, end: datetime }`.
- Backed by `GoogleClient.freebusy(calendar_id, time_min, time_max) -> list[BusyBlock]`, calling Calendar `freebusy.query`, scoped to `calendar.freebusy` / `calendar.readonly`.
- `business_id` is injected by the tool factory (closure/`RunnableConfig`) before the tool is exposed to the model — never an LLM-supplied argument.

**Talks to**
- `LangGraph Agent Graph` (`agent` node) -> invokes this tool during the tool-calling loop.
- This tool -> `google.client.GoogleClient` -> Google Calendar API (`freebusy.query`), using the business's stored OAuth refresh token.

**Constraints & decisions**
- Decision 5: read-only availability now; Calendar write is deferred — the forward-compatible `appointment` table exists but isn't created in MVP, purely additive for later booking.
- Cross-tenant data leakage risk: `business_id` injected via closure/RunnableConfig, never an LLM argument, so the model cannot ask for another tenant's calendar (Constraints & Risks).
- Refresh-token expiry: a `RefreshError` here sets `token_status` and degrades the turn to escalate rather than failing silently (Constraints & Risks).