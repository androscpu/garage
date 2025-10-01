# Cloud Hotel System (PMS + Booking + Payments + 3CX)

A modular, cloud-native hotel management system inspired by QloApps and Hoteliera, with:
- PMS (front desk, housekeeping)
- Booking engine (availability, pricing, reservations)
- Payments (Stripe initially)
- 3CX phone system integration (webhooks, click-to-call)

## Stack
- Node.js + TypeScript (Express)
- PostgreSQL + Prisma ORM
- Docker Compose for local dev
- JWT auth with role-based access

## Quickstart
1) Copy environment template:
```bash
cp .env.example .env
```
2) Start services:
```bash
docker compose up -d --build
```
3) Run DB migrations:
```bash
cd apps/api && npm run db:migrate
```
4) Start API in watch mode:
```bash
cd apps/api && npm run dev
```

## Apps
- apps/api: REST API (Express + Prisma)

## Development
- Formatting: Prettier
- Linting: ESLint

## Licensing
TBD
