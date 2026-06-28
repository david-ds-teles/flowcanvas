---
name: Order Service
status: active
tags:
  - service
  - core
description: Owns the order lifecycle — create, reserve, charge, confirm.
links:
  - examples/commerce-platform/commerce-design.md
  - examples/commerce-platform/runbook.md
---

# Order Service

Owns `create → reserve → charge → confirm`. Calls payments to `charge`, persists to the orders DB,
and emits `order.created` on commit. Idempotent on `orderId`.

The `links:` above are a focus-or-add demo: `commerce-design.md` is already on the board (the chip
**focuses** it), while `runbook.md` is not yet a node (the chip **adds** it and draws a `references`
edge back). See the [runbook](./runbook.md) for on-call procedures.
