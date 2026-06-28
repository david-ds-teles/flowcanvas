---
name: Payment Service
status: active
tags:
  - service
  - core
  - pci
description: Wraps the external Stripe API; isolates PCI scope.
---

# Payment Service

Charges cards via Stripe, idempotent on the order id. PCI scope is contained to this service.
