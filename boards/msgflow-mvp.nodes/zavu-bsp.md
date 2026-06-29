---
name: zavu-bsp
kind: external
description: zavu.dev — hosted WhatsApp Business Service Provider (official Meta BSP). Free tier 2k msgs/mo.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: decision-1-whatsapp-channel
---

# zavu.dev BSP

Third-party hosted WhatsApp channel. Official Meta BSP — zero ban risk (vs. Baileys self-hosted). Eliminates the need for msgflow to run a stateful WhatsApp session process.

**Capabilities:**
- Free tier: 2,000 WhatsApp messages/month.
- **Inbound:** delivers webhooks to `POST /webhooks/zavu`; signed with `x-zavu-signature: sha256=HMAC-SHA256(raw_body, ZAVU_WEBHOOK_SECRET)`.
- **Outbound:** `POST /messages` for free-form text (in 24-h window); pre-approved utility templates for out-of-window replies and owner escalations.
- Multi-channel (Telegram, Email) — deferred channels.

**Swappability:** accessed exclusively through `ChannelAdapter` ABC → `ZavuAdapter`. Per-business migration to Meta Cloud API direct is possible without touching agent logic. `webhook_secret_encrypted` column reserved for that migration.
