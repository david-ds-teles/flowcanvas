---
name: Webhook Handler
description: Receives zavu WhatsApp webhooks, verifies the signature, persists + enqueues an arq job.
kind: service
source:
  path: boards/msgflow-mvp-gen.md
  anchor: api--interface-contracts
---

# Webhook Handler

Receives zavu WhatsApp webhooks, verifies the signature, persists + enqueues an arq job.
