---
name: channel-adapter
kind: process
description: Channel Adapter (ZavuAdapter) — normalizes inbound/outbound WhatsApp messages behind a swappable ChannelAdapter ABC.
source:
  path: .flowcode/plans/msgflow-mvp/msgflow-mvp-design.md
  anchor: api--interface-contracts
---

# Channel Adapter (zavu)

**Module:** `src/msgflow/channel/` — `base.py` (ABC), `zavu.py` (impl), `dto.py`, `registry.py`

Decouples the rest of the system from zavu's specific wire format. Implements the `ChannelAdapter` ABC.

**ABC contract:**
```python
async def verify_webhook(headers: dict, body: bytes) -> bool
async def parse_inbound(payload: dict) -> list[InboundMessage]
async def resolve_business(payload: dict) -> BusinessId
async def send_text(business_id: UUID, to: str, text: str) -> SendResult
async def send_template(business_id, to, template_name, params) -> SendResult
```

**ZavuAdapter specifics:**
- Verification: constant-time `HMAC-SHA256(raw_body, ZAVU_WEBHOOK_SECRET)` vs `x-zavu-signature: sha256=<hex>`.
- Inbound payload: assumed Meta Cloud API envelope (`entry[].changes[].value.{metadata,contacts,messages}`). *(confirm exact shape at zavu integration)*
- Outbound: uses the business's decrypted `api_key_encrypted` from `channel_credential`.
- Caller must verify the 24-h service window before calling `send_text`.

**`send_template`** is used for: owner escalation notices (`OWNER_ESCALATION_TEMPLATE`) and out-of-window customer replies (`OUT_OF_WINDOW_TEMPLATE`). Template pre-approval with zavu is an external dependency.

**Swappability:** swap `ZavuAdapter → CloudApiAdapter` per-business without touching the agent or worker.
