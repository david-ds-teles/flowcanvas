---
name: Google Calendar
kind: external
description: Google Calendar API — read-only free/busy queries powering the check_availability agent tool.
source:
  path: boards/msgflow-mvp.md
  anchor: decision-5-calendar-capability
---

# Google Calendar API

**Scope:** `https://www.googleapis.com/auth/calendar.freebusy`  
**Module:** `src/msgflow/google/calendar.py`  
**Agent tool:** `check_availability(date_from: date, date_to: date) → list[AvailabilitySlot]`

Read-only calendar access via `freebusy.query`. Returns only busy block time ranges — no event titles, attendees, or details, minimizing data exposure.

**Availability derivation:**
1. `GoogleClient.freebusy(calendar_id, time_min, time_max)` → `list[BusyBlock]`.
2. Subtract busy blocks from `business.business_hours` JSONB (`{mon..sun: [{open: "HH:MM", close: "HH:MM"}]}`; times in `business.timezone` IANA).
3. Return free `AvailabilitySlot` windows within configured business hours.

**`calendar_id`:** stored in `google_connection.calendar_id` (defaults to `'primary'`).

**Deferred — Calendar write:** `events.insert` (scope `calendar.events`) for appointment booking. Additive: `'booking'` is already in `agent_intent` enum; scope appended to `granted_scopes TEXT[]`; one new `appointment` table. No existing table changes.
