---
name: zavu.dev — WhatsApp BSP
description: Hosted official WhatsApp channel adapter
source:
  path: boards/msgflow-mvp-design.md
  anchor: decision-1-whatsapp-channel
---
**zavu.dev** is the hosted, official Meta WhatsApp Business Solution Provider that gives msgflow a WhatsApp number without msgflow running any stateful messaging process of its own.

**Responsibilities**
- Hosts the WhatsApp session/number and delivers inbound customer messages to msgflow via webhook.
- Accepts outbound send/template calls from msgflow and relays them to the customer.
- Is reached only through msgflow's `ChannelAdapter` interface — never called directly from route or agent code.

**Contract / Interface**
- Inbound: webhook delivery to `POST /webhooks/zavu`, signed payload msgflow must verify.
- Outbound: adapter calls zavu's send-text / send-template API, resolved by `phone_number_id` per business.
- Tier: free, ~2,000 WhatsApp messages/month — load-bearing for the "pennies per conversation" cost target (Success Criteria).
- Window: standard WhatsApp 24-hour service window governs whether free-form text is allowed.

**Talks to**
- <- Customer (inbound WhatsApp messages)
- -> `POST /webhooks/zavu` (Webhook Ingest) on every inbound message
- <- msgflow agent / arq worker (outbound replies and escalation template sends)

**Constraints & decisions**
- Decision 1: zavu chosen over a direct Cloud API integration for lowest operational burden and official/low-ban-risk status; the `ChannelAdapter` boundary keeps a later per-business swap to the Cloud API possible without touching core logic.
- Outside the 24h window, msgflow cannot send plain text through zavu — only an approved template, or the send is dropped with a logged reason (Constraints & Risks).
- Channel reliability is a named risk ("zavu WhatsApp delivery must stay official") — mitigated by confirming official Meta BSP status and keeping the adapter swap path open (Constraints & Risks).
