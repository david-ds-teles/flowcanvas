---
name: business-owner
kind: actor
description: The business owner — onboards the WhatsApp number and Google Workspace; receives escalation notifications.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: decision-7-human-escalation
---

# Business Owner

The human operator. Has two roles:

1. **Onboarding:** connects the business WhatsApp number (zavu) and authorizes Google OAuth (Calendar + Drive + Sheets scopes). Provisioned via operator CLI: `python -m msgflow.cli.provision` — encrypts the zavu API key and inserts `business` + `channel_credential` rows.
2. **Escalation receiver:** when the agent cannot answer (low confidence, booking request, unsupported query, or explicit human request), the system sends the owner a WhatsApp message containing the conversation summary and a take-over prompt. The owner replies from their own WhatsApp, opening a 24-h service window for follow-ups.

**Escalation triggers:** `booking_request` | `low_confidence` | `unsupported` | `explicit_request`

All owner notifications are sent via a pre-approved utility template (`OWNER_ESCALATION_TEMPLATE`) so they work outside any service window.
