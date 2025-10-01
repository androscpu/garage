## API Surface and Boundaries

### Style
- REST JSON, versioned under `/api/v1`
- OAuth2/OIDC bearer tokens, property-scoped headers
- Webhooks for integrations (3CX, Payments)

### Resources (selected)
- Auth: `/auth/login`, `/auth/refresh`
- Organizations & Properties: `/organizations`, `/properties`
- Guests: `/guests`, `/guests/:id`
- Reservations: `/reservations`, `/reservations/:id`
- Rooms & Inventory: `/rooms`, `/room-types`, `/inventory`
- Housekeeping: `/housekeeping/tasks`, `/housekeeping/rooms`
- Payments & Folios: `/folios`, `/payments`, `/refunds`
- Telephony: `/telephony/interactions`, `/telephony/click-to-dial`

### Webhooks
- `/webhooks/3cx`
- `/webhooks/stripe`

### Errors
- RFC 7807 problem+json with error codes and correlation IDs

