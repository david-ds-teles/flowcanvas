---
name: lookup_price tool
description: Price lookup against the business's Google Sheet
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-6-price-source
---
**A LangGraph grounding tool that answers "how much does X cost" by reading the business's own price list from Google Sheets — never invents a number.**

**Responsibilities**
- Reads rows from the business's designated prices Google Sheet, optionally filtered by a service name, to ground price answers.
- Treats the Sheet as the single canonical, owner-maintainable price source — no hallucinated prices.
- Returns structured price/service pairs the agent composes into the reply.

**Contract / Interface**
- Tool signature (as bound for the model): `lookup_price(query: str | None = None) -> list[PriceItem]`, `PriceItem { name: str, price: str, unit: str | None, notes: str | None }`.
- Backed by `GoogleClient.read_prices_sheet(spreadsheet_id, range_a1) -> list[list[str]]`, calling Sheets `values.get`, scoped to `sheets.readonly`.
- `business_id` is tenant-scoped from `RunnableConfig`/closure to select the correct `knowledge_source` Sheet — never an LLM-supplied argument.

**Talks to**
- `LangGraph Agent Graph` (`agent` node) -> invokes this tool when the turn needs pricing.
- This tool -> `google.client.GoogleClient` -> Google Sheets API (`values.get`), using the business's stored OAuth refresh token.
- `knowledge_source` table -> supplies the per-business Sheet ID this tool reads.

**Constraints & decisions**
- Decision 6: a designated Google Sheet is the canonical price source — the Forms API was rejected as too brittle for a clean, owner-editable price list.
- New-business onboarding requires no code changes: pointing the system at the prices Sheet is config-driven (Success Criteria).
- Cross-tenant leakage risk applies here too — tenant-scoped `business_id` from config, every query scoped, never an LLM argument (Constraints & Risks).