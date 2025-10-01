# Architecture Overview (Initial)

## Goals
- Modular monolith to start, service boundaries clear for future split
- Support PMS, Housekeeping, Booking, Payments, 3CX integration
- Multi-property capable, role-based access, auditable

## Components
- API (FastAPI):
  - Routers: `pms`, `housekeeping`, `booking`, `payments`, `telephony`
  - Auth/RBAC (to be added): JWT with roles (owner, front-desk, housekeeping, finance)
  - Background jobs (to be added): Celery/RQ style via Redis
- Database (PostgreSQL):
  - Core relational schema: properties, room types, rooms, rates, reservations, folios, payments, housekeeping tasks
  - Migrations: Alembic (planned)
- Cache/Queue (Redis):
  - Caching availability, rate calculations, and background task queue
- Telephony (3CX):
  - Webhook endpoint for call events (screen-pop)
  - Click-to-call via 3CX API (server-to-3CX)
- Payments (Stripe initial):
  - Create/capture/refund payment intents, webhook handling

## Data Flow (examples)
- Booking:
  1) Availability search -> Inventory and RatePlan
  2) Hold and quote -> Create Reservation (pending)
  3) Payment intent -> confirm -> Reservation (booked)
- Check-in/out:
  - Update reservation status, manage folio charges, housekeeping triggers
- Housekeeping:
  - Front desk marks room status; tasks assigned; mobile views consume `/housekeeping`
- Telephony:
  - 3CX -> webhook -> match caller to reservation/guest -> surface screen-pop

## Non-Functional
- Observability: structured logs, metrics, traces (to be added)
- Security: input validation, RBAC, audit logs, PII handling
- Scalability: horizontal API scale; DB vertically for now; Redis for hot paths

## Deployment
- Local: Docker Compose (Postgres/Redis + API)
- Cloud: Later via IaC (Terraform), managed Postgres/Redis, container orchestrator