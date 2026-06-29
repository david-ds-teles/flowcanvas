---
name: webhook-handler
kind: service
description: FastAPI route — POST /webhooks/zavu. Ingests, deduplicates, persists, and enqueues inbound WhatsApp messages.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: api--interface-contracts
---

# FastAPI Webhook Handler

**Module:** `src/msgflow/api/routes/webhooks_zavu.py`

Entry point for every inbound WhatsApp message. Runs on the HTTP request path and must ACK within the provider's retry budget.

**Request flow:**
1. `ChannelAdapter.verify_webhook(headers, body)` — HMAC-SHA256 constant-time check; 403 on failure.
2. `ChannelAdapter.parse_inbound(payload)` → `list[InboundMessage]`.
3. Resolve `business_id` by `wa_phone_number_id` from `channel_credential`.
4. Upsert `contact` (phone + `wa_profile_name`); append `message` row (`direction='inbound'`).
5. Dedup: if `wa_message_id` already exists → `WebhookAck(status='duplicate')` (200, no-op).
6. Enqueue `handle_inbound` arq job → `WebhookAck(status='accepted', accepted=1)`.
7. Redis down → 503 (provider retries).

**Also handles:** `GET /webhooks/zavu` — provider verification handshake (echo challenge).

**Response:** `WebhookAck { status: str, accepted: int }`
