---
name: Commerce Platform — Design
status: approved
tags:
  - design
  - commerce
  - architecture
description: Source design doc the board was extracted from — services derive-from this, it stays on disk as the reference.
links:
  - examples/commerce-platform/order-service.md
  - examples/commerce-platform/payment-service.md
---

# Commerce Platform — Design

The board is a decomposed view of this document. Every service node carries a `source`
provenance pointer back to a heading here; the typed `derives-from` edges trace the extraction.

## Edge

The [API gateway](./api-gateway.md) terminates TLS, authenticates requests, and fans out to the
core services. It is the only public entry point.

## Authentication

The [auth service](./auth-service.md) issues and verifies session tokens; the gateway calls it on
every request (an `informs` edge on the board).

## Order lifecycle

The [order service](./order-service.md) owns `create → reserve → charge → confirm`. It calls
[payments](./payment-service.md) to `charge`, persists to the orders DB, and emits `order.created`
onto the event bus on commit.

## Payments

The [payment service](./payment-service.md) wraps the external Stripe API (PCI scope is isolated
here). Charges are idempotent on the order id.
