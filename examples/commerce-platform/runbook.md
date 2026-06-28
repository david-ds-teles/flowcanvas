---
name: Order Service Runbook
status: living
tags:
  - ops
  - runbook
description: On-call procedures for the order service — the off-board reference target.
---

# Order Service Runbook

This file exists on disk but is **not** a node on the board. Clicking the `runbook.md` reference chip
on the order service adds it here and draws a `references` edge back — the focus-or-add path (Decision 9).

## Stuck orders

Orders stuck in `reserved` for > 10m: check the payment service and the `order.created` consumer lag.
