## 3CX Integration Plan

### Objectives
- Screen-pop guest/booking on inbound calls
- Log calls to guest profiles and reservations
- Enable click-to-dial from the PMS

### Components
- 3CX Webhooks: Receive call events (ringing, answered, ended)
- 3CX Call Control API / CRM: For screen-pop and contact sync
- Integration Service: Validates events, matches caller to guest/reservation

### Inbound Flow
1. 3CX sends webhook with caller ID and extension
2. Service normalizes phone, searches guests in scope of agent's property
3. If matched, generate screen-pop link with guest/reservation context
4. Log call start; update on answered/end with duration and disposition

### Outbound Flow (Click-to-Dial)
1. User clicks dial in UI; service requests 3CX to start call from agent extension
2. Create pending interaction record; reconcile on call end

### Data Model Additions
- `telephony_interactions` linked to `guest_id`, `reservation_id`, `property_id`
- Fields: direction, status, started_at, ended_at, duration_ms, notes

### Security
- IP allowlist for 3CX server
- HMAC-signed webhooks with rotating secrets

### UX
- Screen-pop deeplink format: `/guests/:id?reservation=:resId&tab=interactions`

