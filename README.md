# CloudHotel PMS - Cloud Hotel Management System

A comprehensive cloud-based hotel management system with Property Management System (PMS), housekeeping management, booking system, payment processing, and 3CX phone system integration.

## Features

### 🏨 Property Management System (PMS)
- Complete hotel and room management
- Real-time room status tracking (Available, Occupied, Cleaning, Maintenance)
- Multi-hotel support
- Room types, pricing, and amenities management

### 📅 Booking System
- Advanced reservation management
- Real-time room availability checking
- Booking status workflow (Pending → Confirmed → Checked In → Checked Out)
- Automatic booking reference generation
- Guest information management
- Special requests handling

### 🧹 Housekeeping Module
- Task creation and assignment
- Priority-based task management
- Task status tracking (Pending → In Progress → Completed → Verified)
- Automatic task creation on checkout
- Staff workload monitoring
- Room cleaning checklists

### 💳 Payment Processing
- Stripe integration for secure payments
- Multiple payment methods support
- Payment status tracking
- Refund management
- Revenue analytics and reporting

### ☎️ 3CX Phone System Integration
- Make and receive calls
- Call transfer functionality
- Active call monitoring
- Call history and analytics
- Room extension management
- Presence status management
- SMS notifications (optional)

### 📊 Dashboard & Analytics
- Real-time occupancy rates
- Revenue tracking (daily/monthly)
- Booking statistics
- Housekeeping task overview
- Upcoming check-ins/check-outs
- Interactive charts and graphs

### 🔐 Authentication & Authorization
- Role-based access control (Admin, Manager, Receptionist, Housekeeping, Guest)
- JWT token authentication
- Secure password hashing
- User management

## Technology Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Database
- **Stripe** - Payment processing
- **Redis** - Caching (optional)
- **Alembic** - Database migrations

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Project Structure

```
cloudhotel-pms/
├── backend/
│   ├── routers/           # API endpoints
│   │   ├── auth.py
│   │   ├── bookings.py
│   │   ├── dashboard.py
│   │   ├── housekeeping.py
│   │   ├── hotels.py
│   │   ├── payments.py
│   │   ├── rooms.py
│   │   └── threecx.py
│   ├── services/          # Business logic
│   │   ├── booking_service.py
│   │   ├── housekeeping_service.py
│   │   ├── payment_service.py
│   │   └── threecx_service.py
│   ├── auth.py           # Authentication
│   ├── database.py       # Database configuration
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   └── main.py           # Application entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # API client
│   │   ├── store/        # State management
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt      # Python dependencies
├── package.json          # Node dependencies
└── README.md
```

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional)

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd cloudhotel-pms
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Set up database**
```bash
# Create PostgreSQL database
createdb hotel_db

# Run migrations (if using Alembic)
alembic upgrade head
```

6. **Run the backend**
```bash
python -m backend.main
# Or using uvicorn directly:
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env if needed (default: http://localhost:8000)
```

4. **Run the frontend**
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

## Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# 3CX
THREECX_API_URL=https://your-3cx-server.com:5001/api
THREECX_API_KEY=your-api-key
THREECX_EXTENSION_PREFIX=2000

# Redis
REDIS_URL=redis://localhost:6379

# Email & SMS
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### Hotels & Rooms
- `GET /api/hotels` - List hotels
- `POST /api/hotels` - Create hotel
- `GET /api/rooms` - List rooms
- `GET /api/rooms/available` - Get available rooms

#### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `POST /api/bookings/{id}/confirm` - Confirm booking
- `POST /api/bookings/{id}/check-in` - Check in guest
- `POST /api/bookings/{id}/check-out` - Check out guest

#### Housekeeping
- `GET /api/housekeeping/tasks` - List tasks
- `POST /api/housekeeping/tasks` - Create task
- `POST /api/housekeeping/tasks/{id}/start` - Start task
- `POST /api/housekeeping/tasks/{id}/complete` - Complete task

#### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Create payment
- `POST /api/payments/{id}/confirm` - Confirm payment
- `POST /api/payments/{id}/refund` - Refund payment

#### 3CX Phone System
- `POST /api/3cx/calls/make` - Make a call
- `POST /api/3cx/calls/transfer` - Transfer call
- `GET /api/3cx/calls/active` - Get active calls
- `GET /api/3cx/calls/history` - Get call history

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/revenue-chart` - Get revenue data
- `GET /api/dashboard/occupancy-chart` - Get occupancy data

## User Roles & Permissions

### Admin
- Full system access
- Manage hotels, rooms, users
- View all reports and analytics
- System configuration

### Manager
- Manage bookings and check-ins/outs
- View reports and analytics
- Manage housekeeping tasks
- Process payments

### Receptionist
- Create and manage bookings
- Check in/out guests
- Process payments
- Handle phone calls

### Housekeeping
- View assigned tasks
- Update task status
- Mark tasks as complete

### Guest
- View own bookings
- Make payments
- View booking history

## 3CX Integration Setup

1. **Enable 3CX API**
   - Log into your 3CX Management Console
   - Go to Settings → Advanced → API
   - Enable API and generate API key

2. **Configure Extensions**
   - Assign extensions to rooms (e.g., Room 101 → Extension 2101)
   - Set up extension forwarding rules
   - Configure voicemail settings

3. **Webhook Configuration**
   - Set up webhook URL: `https://your-domain.com/api/3cx/calls/log`
   - Enable call events (start, end, transfer)

## Payment Processing Setup

1. **Create Stripe Account**
   - Sign up at https://stripe.com
   - Get API keys from Dashboard

2. **Configure Webhook**
   - Add webhook endpoint: `https://your-domain.com/api/payments/webhook`
   - Subscribe to `payment_intent.succeeded` event

3. **Test Mode**
   - Use test API keys for development
   - Test card: 4242 4242 4242 4242

## Development

### Running Tests
```bash
# Backend tests
pytest

# Frontend tests
npm test
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Quality
```bash
# Backend linting
black backend/
flake8 backend/

# Frontend linting
npm run lint
```

## Deployment

### Production Checklist
- [ ] Set strong SECRET_KEY
- [ ] Use production database
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS certificates
- [ ] Configure production Stripe keys
- [ ] Set up Redis for caching
- [ ] Configure email service
- [ ] Set up monitoring and logging
- [ ] Enable database backups
- [ ] Configure CDN for static assets

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please email support@cloudhotel.com or open an issue on GitHub.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced reporting and analytics
- [ ] Inventory management
- [ ] Restaurant/F&B module
- [ ] Loyalty program integration
- [ ] Channel manager integration (Booking.com, Expedia)
- [ ] Smart room IoT integration
- [ ] AI-powered pricing optimization

## Comparison with QloApps and Hoteliera

This system offers similar functionality to QloApps and Hoteliera with additional features:
- ✅ Modern React frontend with TypeScript
- ✅ Native 3CX phone system integration
- ✅ Advanced housekeeping workflow
- ✅ Real-time dashboard analytics
- ✅ RESTful API architecture
- ✅ Stripe payment integration
- ✅ Role-based access control

---

Built with ❤️ for the hospitality industry
