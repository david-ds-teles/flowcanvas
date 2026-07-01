---
name: escalation
description: A conversation handed to the business owner
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-7-human-escalation
---
**The handoff record that pulls a conversation out of auto-reply and into the business owner's hands on WhatsApp.**

**Responsibilities**
- Created by the `escalate_to_human` agent tool whenever a request is a booking, unsupported, or low-confidence.
- Pauses auto-replies for that conversation until the owner resolves it — Decision 7, WhatsApp-native, no web UI.

**Contract / Interface**
- Row carries `business_id`, a reference to the triggering `conversation`, a reason, status, and `created_at`.
- Writing the row also flips `conversation.status` to `escalated`, which arq-worker checks before attempting further auto-replies.
- Owner notification is sent via a pre-approved WhatsApp utility template rather than free-form text, since escalation can fall outside any 24h service window.

**Talks to**
- `escalate_to_human` tool `->` writes the escalation row
- arq-worker `->` creates the row + triggers the owner notification on booking/unsupported/low-confidence
- `conversation` (db-contacts) `<-` status set to `escalated`, pausing further auto-replies

**Constraints & decisions**
- Decision 7: notify-owner-on-WhatsApp + pause, explicitly no admin/inbox UI — keeps the MVP backend-only.
- Risk: an escalation notification can itself fall outside the 24h service window and silently fail as free-form text — mitigated by always sending via a pre-approved utility template.
- Appointment booking is out of scope but funnels through here today: any booking request is escalated rather than auto-handled, by design.