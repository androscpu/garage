Cloud Hotel System (PMS, Booking, Housekeeping, Payments, 3CX)

Overview
This repository contains a cloud-native hospitality platform with core PMS, housekeeping, booking engine, payments integration, and 3CX telephony integration stubs.

Key Features
- PMS: Reservations, folios, check-in/out, room assignment
- Housekeeping: Room status, tasks, assignments
- Booking Engine: Availability search, rate plans, bookings
- Payments: Stripe-ready flow (capture/refund), invoice stubs
- 3CX Integration: Webhook endpoint for call events, click-to-call stub
- Multi-property support foundations

Tech Stack
- API: FastAPI (Python)
- DB: PostgreSQL
- Cache/Queue: Redis
- Runtime: Docker Compose (local)

Getting Started
1) Copy environment file and update values:
   cp .env.example .env

2) Build and start services:
   docker compose up -d --build

3) API will be available at:
   http://localhost:8000
   Docs: http://localhost:8000/docs

Project Structure
- docker-compose.yml
- api/
  - Dockerfile
  - requirements.txt
  - app/
    - main.py
    - db.py
    - routers/
      - pms.py
      - housekeeping.py
      - booking.py
      - payments.py
      - telephony.py
- docs/
  - domain-model.md
  - architecture.md

Notes
- Database migrations will be added in a later step (Alembic).
- Payments integration starts with Stripe; other gateways can be added.

