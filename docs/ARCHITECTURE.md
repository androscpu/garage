## Architecture and Tenancy

### Goals
- Multi-tenant SaaS for hotels and groups
- Strong isolation by property and by organization
- Extensible integrations (3CX, payments, OTA, accounting)

### Tenancy Model
- Tenant: `Organization` (hotel group) contains one or more `Property`
- User belongs to `Organization`; scoped roles grant access per `Property`
- Data partitioning: row-level scoping with `organization_id` and `property_id`
- Optional physical isolation for enterprise: dedicated DB/schema per org

### Services (Modular Monolith evolving to SOA)
- API Gateway (NestJS) exposes REST and Webhooks
- Modules: PMS, Booking, Housekeeping, Payments, Integrations, Reporting
- Internal event bus (RabbitMQ) for decoupled workflows

### Data
- PostgreSQL primary, schemas grouped by bounded context
- Read replicas for analytics/reporting
- Redis for caching, rate plans, session, and queues (bullmq optional)

### Key Flows
- Reservation lifecycle: quote → hold → confirm → check-in → folio → check-out
- Housekeeping: room status → tasks → inspections → turn-down
- Payments: capture/authorize, folio charges, refunds, payouts
- Telephony: inbound call → match guest → screen-pop → log interaction

### Scalability & Reliability
- Stateless services with autoscaling; background jobs for heavy workflows
- Idempotent handlers and exactly-once semantics via dedupe keys
- Observability: metrics, structured logs, traces

