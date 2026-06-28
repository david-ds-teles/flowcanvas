---
name: API Gateway
status: active
tags:
  - service
  - edge
description: Public entry point — TLS termination, auth, request fan-out.
---

# API Gateway

Routes `POST /orders` to the order service. Calls the auth service to verify the session token on
every request. The only node in the **Edge** subsystem.
