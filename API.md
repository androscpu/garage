# API Documentation

This document provides comprehensive documentation for the Cloud Hotel Management System API.

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints (except login/register) require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow
1. Login with email/password to get JWT token
2. Include token in Authorization header for all requests
3. Token expires based on JWT_EXPIRES_IN setting (default: 7 days)

---

## 🔐 Authentication Endpoints

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "role": "receptionist",
      "hotelId": "uuid"
    },
    "token": "jwt_token_here"
  }
}
```

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "receptionist",
  "hotelId": "uuid"
}
```

### Get Current User
```http
GET /auth/me
```

### Update Profile
```http
PUT /auth/me
```

### Change Password
```http
PUT /auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 🏨 Hotel Management

### Get All Hotels (Super Admin Only)
```http
GET /hotels?page=1&limit=10&search=hotel&isActive=true
```

### Get Hotel Details
```http
GET /hotels/{hotelId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hotel": {
      "id": "uuid",
      "name": "Grand Hotel",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "country": "USA"
      },
      "phone": "+1234567890",
      "email": "info@grandhotel.com",
      "starRating": 5,
      "currency": "USD"
    },
    "stats": {
      "rooms": {
        "total": 100,
        "available": 75,
        "occupied": 20,
        "maintenance": 5,
        "occupancyRate": 20.0
      }
    }
  }
}
```

### Create Hotel
```http
POST /hotels
```

**Request Body:**
```json
{
  "name": "Grand Hotel",
  "description": "Luxury hotel in downtown",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "phone": "+1234567890",
  "email": "info@grandhotel.com",
  "starRating": 5,
  "currency": "USD"
}
```

---

## 🛏️ Room Management

### Get Hotel Rooms
```http
GET /rooms/hotel/{hotelId}?page=1&limit=20&status=available&floor=1&roomTypeId=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "uuid",
        "roomNumber": "101",
        "floor": 1,
        "status": "available",
        "condition": "excellent",
        "RoomType": {
          "id": "uuid",
          "name": "Deluxe Room",
          "basePrice": 150.00,
          "maxOccupancy": 2
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

### Get Room Details
```http
GET /rooms/{roomId}
```

### Create Room
```http
POST /rooms
```

**Request Body:**
```json
{
  "hotelId": "uuid",
  "roomNumber": "101",
  "floor": 1,
  "roomTypeId": "uuid",
  "features": {
    "balcony": true,
    "oceanView": false,
    "kitchenette": false
  }
}
```

### Update Room
```http
PUT /rooms/{roomId}
```

**Request Body:**
```json
{
  "status": "maintenance",
  "condition": "good",
  "notes": "AC needs repair"
}
```

### Room Availability
```http
GET /rooms/{roomId}/availability?startDate=2024-01-01&endDate=2024-01-07
```

---

## 📅 Booking Management

### Get Hotel Bookings
```http
GET /bookings/hotel/{hotelId}?page=1&limit=20&status=confirmed&checkInDate=2024-01-01
```

### Get Booking Details
```http
GET /bookings/{bookingId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingNumber": "BK20240101001",
    "checkInDate": "2024-01-01",
    "checkOutDate": "2024-01-03",
    "adults": 2,
    "children": 0,
    "status": "confirmed",
    "totalAmount": 300.00,
    "paidAmount": 150.00,
    "paymentStatus": "partial",
    "Guest": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "Room": {
      "roomNumber": "101",
      "RoomType": {
        "name": "Deluxe Room"
      }
    }
  }
}
```

### Create Booking
```http
POST /bookings
```

**Request Body:**
```json
{
  "hotelId": "uuid",
  "roomId": "uuid",
  "guestId": "uuid",
  "checkInDate": "2024-01-01",
  "checkOutDate": "2024-01-03",
  "adults": 2,
  "children": 0,
  "totalAmount": 300.00,
  "specialRequests": "Late check-in"
}
```

### Check-in Guest
```http
POST /bookings/{bookingId}/checkin
```

**Request Body:**
```json
{
  "roomId": "uuid",
  "notes": "Guest arrived early"
}
```

### Check-out Guest
```http
POST /bookings/{bookingId}/checkout
```

**Request Body:**
```json
{
  "charges": [
    {
      "description": "Mini bar",
      "amount": 25.00
    }
  ],
  "notes": "Late checkout approved"
}
```

### Cancel Booking
```http
POST /bookings/{bookingId}/cancel
```

### Hotel Availability
```http
GET /bookings/hotel/{hotelId}/availability?startDate=2024-01-01&endDate=2024-01-03&adults=2&children=0
```

---

## 👥 Guest Management

### Get Guests
```http
GET /guests?page=1&limit=20&search=john&vipStatus=gold&hotelId=uuid
```

### Get Guest Details
```http
GET /guests/{guestId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "vipStatus": "gold",
    "loyaltyPoints": 2500,
    "totalStays": 5,
    "totalSpent": 1500.00,
    "Bookings": [
      {
        "id": "uuid",
        "bookingNumber": "BK20240101001",
        "status": "completed",
        "Hotel": {
          "name": "Grand Hotel"
        }
      }
    ]
  }
}
```

### Create Guest
```http
POST /guests
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "nationality": "USA",
  "address": {
    "street": "456 Oak St",
    "city": "Boston",
    "state": "MA",
    "country": "USA"
  }
}
```

### Update VIP Status
```http
POST /guests/{guestId}/vip-status
```

**Request Body:**
```json
{
  "vipStatus": "platinum"
}
```

### Add Loyalty Points
```http
POST /guests/{guestId}/loyalty-points
```

**Request Body:**
```json
{
  "points": 100,
  "reason": "Bonus points for review"
}
```

---

## 🧹 Housekeeping Management

### Get Housekeeping Tasks
```http
GET /housekeeping/hotel/{hotelId}?page=1&status=pending&type=cleaning&priority=high
```

### Get Task Details
```http
GET /housekeeping/{taskId}
```

### Create Task
```http
POST /housekeeping
```

**Request Body:**
```json
{
  "hotelId": "uuid",
  "roomId": "uuid",
  "type": "cleaning",
  "title": "Room cleaning after checkout",
  "description": "Standard checkout cleaning",
  "priority": "medium",
  "scheduledFor": "2024-01-01T14:00:00Z",
  "estimatedDuration": 60,
  "checklist": [
    {
      "item": "Change bed linens",
      "completed": false
    },
    {
      "item": "Clean bathroom",
      "completed": false
    }
  ]
}
```

### Update Task
```http
PUT /housekeeping/{taskId}
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Task completed successfully",
  "checklist": [
    {
      "item": "Change bed linens",
      "completed": true,
      "completedAt": "2024-01-01T14:30:00Z"
    }
  ]
}
```

### Assign Task
```http
POST /housekeeping/{taskId}/assign
```

**Request Body:**
```json
{
  "assignedTo": "uuid"
}
```

### Get My Tasks
```http
GET /housekeeping/my-tasks/{hotelId}?status=pending&date=2024-01-01
```

---

## 💳 Payment Management

### Get Booking Payments
```http
GET /payments/booking/{bookingId}
```

### Create Payment Intent (Stripe)
```http
POST /payments/create-intent
```

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 150.00,
  "currency": "usd",
  "description": "Hotel booking payment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "amount": 150.00,
      "status": "pending"
    },
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
}
```

### Process Cash Payment
```http
POST /payments/cash
```

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 150.00,
  "currency": "USD",
  "description": "Cash payment at reception"
}
```

### Process Card Payment
```http
POST /payments/card
```

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 150.00,
  "cardLast4": "4242",
  "cardBrand": "visa",
  "authCode": "123456"
}
```

### Refund Payment
```http
POST /payments/{paymentId}/refund
```

**Request Body:**
```json
{
  "amount": 75.00,
  "reason": "Guest cancellation"
}
```

---

## 📞 3CX Call Management

### Get Hotel Calls
```http
GET /3cx/calls/hotel/{hotelId}?page=1&status=completed&direction=inbound&startDate=2024-01-01
```

### Get Call Details
```http
GET /3cx/calls/{callId}
```

### Update Call Record
```http
PUT /3cx/calls/{callId}
```

**Request Body:**
```json
{
  "notes": "Guest inquiry about room service",
  "callType": "inquiry",
  "priority": "medium",
  "resolution": "resolved",
  "guestId": "uuid",
  "bookingId": "uuid"
}
```

### Make Outbound Call
```http
POST /3cx/calls/outbound
```

**Request Body:**
```json
{
  "toNumber": "+1234567890",
  "fromExtension": "101",
  "guestId": "uuid",
  "bookingId": "uuid"
}
```

### Transfer Call
```http
POST /3cx/calls/{callId}/transfer
```

**Request Body:**
```json
{
  "toExtension": "102"
}
```

---

## 📊 Dashboard & Analytics

### Get Hotel Dashboard
```http
GET /dashboard/hotel/{hotelId}?period=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "rooms": {
        "total": 100,
        "available": 75,
        "occupied": 20,
        "occupancyRate": 20.0
      },
      "revenue": {
        "totalRevenue": 15000.00,
        "totalTransactions": 50,
        "averageTransaction": 300.00
      }
    },
    "today": {
      "arrivals": [
        {
          "Guest": {
            "firstName": "John",
            "lastName": "Doe"
          },
          "Room": {
            "roomNumber": "101"
          }
        }
      ]
    }
  }
}
```

### Get Quick Stats
```http
GET /dashboard/quick-stats/{hotelId}
```

---

## 📝 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Validation error details"]
}
```

### Common Error Codes
- `TOKEN_REQUIRED`: No authentication token provided
- `INVALID_TOKEN`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Resource already exists

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

---

## 🔄 Real-time Events (Socket.io)

The system provides real-time updates via Socket.io:

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
});

// Join hotel room for updates
socket.emit('join-hotel', hotelId);
```

### Events
- `new-booking`: New booking created
- `booking-updated`: Booking status changed
- `guest-checkedin`: Guest checked in
- `guest-checkedout`: Guest checked out
- `room-updated`: Room status changed
- `new-housekeeping-task`: New task created
- `task-assigned`: Task assigned to user
- `incoming-call`: New phone call
- `payment-received`: Payment processed

---

## 📋 Rate Limiting

API endpoints are rate limited:
- **Default**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **Payment**: 10 payment requests per minute per user

---

## 🔍 Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

---

## 🔍 Filtering & Search

Most list endpoints support filtering:

**Common Parameters:**
- `search`: Text search in relevant fields
- `status`: Filter by status
- `startDate`/`endDate`: Date range filtering
- `sortBy`: Sort field
- `sortOrder`: `asc` or `desc`

---

This API documentation covers all major endpoints. For additional details or custom implementations, refer to the source code or contact the development team.