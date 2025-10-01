## Cloud Hotel Platform (PMS, Booking, Housekeeping, Payments) with 3CX Integration

This repository contains the blueprint for a multi-tenant cloud hotel platform similar to QloApps and Hoteliera, with native 3CX phone system integration. It includes PMS, booking engine, housekeeping, payments, and admin capabilities.

### Core Capabilities
- PMS and Front Desk
- Booking Engine (multi-property, OTA-compatible)
- Housekeeping & Maintenance
- Payments, Invoicing, Folios, and Payouts
- 3CX Integration (screen-pop, call logging, call routing)
- Reports & Analytics

### High-Level Tech Stack
- Backend: Node.js (NestJS) or Java (Spring Boot) — suggested: NestJS
- Frontend: React (Next.js App Router)
- Data: PostgreSQL (SQL), Redis (cache/queues)
- Search & Rates: PostgreSQL + optional OpenSearch for free-text
- Messaging/Async: Kafka or RabbitMQ (suggested: RabbitMQ to start)
- Infra: Kubernetes on a major cloud (EKS/GKE/AKS) with IaC (Terraform)
- Auth: OpenID Connect (Keycloak/ORY), JWT, RBAC
- Payments: Stripe (primary), Adyen (optional enterprise)
- Telephony: 3CX (REST, Webhooks, Call Control API)

### Monorepo Structure (proposed)
```
apps/
  api/                # NestJS services (gateway + modules)
  web/                # Next.js frontend
  workers/            # Queue consumers for async jobs
packages/
  domain/             # Shared domain types, validation, events
  ui/                 # Reusable UI components
infra/
  terraform/          # IaC for cloud resources
  helm/               # Helm charts for k8s deployment
docs/                 # Architecture and integration docs
```

### Getting Started
1) Read `docs/ARCHITECTURE.md` for tenancy and service layout
2) Read `docs/MODULES.md` for domain modules
3) Read `docs/INTEGRATIONS_3CX.md` for 3CX flows
4) Read `docs/PAYMENTS.md` for financial flows
5) Read `docs/API.md` for API surface
6) Read `docs/SECURITY.md` for authN/Z and compliance
7) Read `docs/DEVOPS.md` for environments and CI/CD

### License
Draft, to be defined (proprietary or dual-license).

