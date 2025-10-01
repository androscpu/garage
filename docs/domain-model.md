# Domain Model (Initial Draft)

## Core Entities
- Organization: Entity that owns one or more properties
- Property (Hotel): Name, address, timezone, currency, policies
- RoomType: Code, name, capacity, amenities
- Room: Number, floor, status, links to RoomType
- RatePlan: Name, cancellation policy, pricing rules
- Inventory: Date-based availability per RoomType
- Reservation: Guest details, dates, status (booked/checked-in/checked-out/canceled)
- ReservationItem: Per-night pricing and tax details
- Folio: Charges, payments, balance
- Payment: Method, amount, currency, status
- HousekeepingTask: Task type, room, due time, assigned to
- HousekeepingStatus: Clean/Dirty/OutOfOrder
- User: Roles (owner, front-desk, housekeeping, finance)

## Relationships
- Organization 1..* Property
- Property 1..* RoomType
- RoomType 1..* Room
- Property 1..* RatePlan
- RoomType x Date -> Inventory
- Reservation -> RoomType, possibly Room assignment
- Reservation 1..* ReservationItem
- Folio 1..* Payment
- Room 1..* HousekeepingTask

## Events
- BookingCreated, BookingModified, BookingCanceled
- CheckIn, CheckOut, NoShow
- PaymentCaptured, PaymentRefunded, PaymentFailed
- HousekeepingTaskAssigned, HousekeepingTaskCompleted
- CallStarted, CallEnded (3CX)

## Multi-Property Considerations
- Users scoped to organizations and properties
- Currency, tax rules per property