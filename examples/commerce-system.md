---
name: Commerce Platform — System Design
status: approved
---

# Commerce Platform — System Design

This board is a **system-design view** of this document. Every component on the canvas traces back to
a heading here via `meta.source`; the typed edges trace the documented relationships. Edit a section in
the spine and **Submit changes** to have the agent re-extract the affected components.

## API Gateway

The edge of the system. Terminates TLS, authenticates every request, and fans requests out to the
core services. *Informs* the Auth Service on each request and *calls* the Order Service.

## Customer

The human placing orders through the storefront. *Calls* the API Gateway.

## Auth Service

Issues and verifies **session tokens** for every request. The only component permitted to mint a
token; everything else calls `verify(token)`.

## Order Service

Owns the order lifecycle and `POST /orders`. **Produces** `order.created` onto the Event Bus, writes
to the Orders DB, and *calls* the Payment Service.

## Payment Service

Wraps the third-party processor and isolates PCI scope. *Depends on* Stripe.

## Orders DB

Postgres datastore for orders and line items. Written only by the Order Service.

## Event Bus

Kafka topics carrying domain events (`order.created`, `payment.captured`) between services.

## Stripe API

Third-party card processor, outside the ownership boundary.
