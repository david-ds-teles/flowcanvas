---
name: google-sheets
kind: external
description: Google Sheets API — reads the canonical prices spreadsheet for the lookup_price agent tool.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: decision-6-price-source
---

# Google Sheets API

**Scope:** `https://www.googleapis.com/auth/sheets.readonly`  
**Module:** `src/msgflow/google/sheets.py`  
**Agent tool:** `lookup_price(query: str | None = None) → list[PriceItem]`

Reads the business's canonical price list from a designated Google Sheet. The Sheet is owner-maintained and human-readable — chosen over Google Forms (which stores submitted responses, not a price list).

**Per-business config** in `knowledge_source.config` JSONB:
```json
{
  "range": "Sheet1!A1:D100",
  "name_col": 0,
  "price_col": 1,
  "unit_col": 2
}
```

**Operation:** `GoogleClient.read_prices_sheet(spreadsheet_id, range_a1)` → `list[list[str]]`; each row mapped to `PriceItem { name, price, unit, notes }` (DTOs defined in `knowledge/dto.py`).

**Filtering:** when `query` is provided, rows are filtered by case-insensitive substring match on `name` before returning to the agent.

**`spreadsheet_id`** stored in `knowledge_source.google_file_id`.
