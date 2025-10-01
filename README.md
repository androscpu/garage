# Cloud Hotel Management System

A comprehensive cloud-based hotel management system with PMS (Property Management System), booking management, housekeeping, payments, and 3CX phone system integration.

## 🏨 Features

### Core PMS Features
- **Hotel Management**: Multi-hotel support for super administrators
- **Room Management**: Room types, availability, status tracking
- **Booking System**: Reservations, check-in/out, availability calendar
- **Guest Management**: Guest profiles, preferences, loyalty programs
- **Real-time Updates**: Socket.io integration for live updates

### Housekeeping Module
- **Task Management**: Cleaning, maintenance, inspection tasks
- **Staff Assignment**: Assign tasks to housekeeping staff
- **Priority System**: Urgent, high, medium, low priority tasks
- **Room Status Integration**: Automatic status updates

### Payment Processing
- **Stripe Integration**: Secure online payments
- **Multiple Payment Methods**: Cash, card, bank transfer
- **Refund Management**: Process refunds and chargebacks
- **Payment Analytics**: Revenue tracking and reporting

### 3CX Phone System Integration
- **Call Management**: Inbound/outbound call tracking
- **Guest Integration**: Link calls to guest profiles and bookings
- **Call Analytics**: Call volume, duration, answer rates
- **Real-time Notifications**: Live call alerts

### Dashboard & Analytics
- **Real-time Dashboard**: Occupancy rates, revenue, tasks
- **Visual Analytics**: Charts and graphs for key metrics
- **Quick Stats**: Today's arrivals, departures, pending tasks
- **Performance Metrics**: Staff performance, room utilization

## 🚀 Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with Sequelize ORM
- **Socket.io** for real-time communication
- **JWT** authentication and authorization
- **Stripe** for payment processing
- **Winston** for logging
- **Redis** for caching (optional)

### Frontend
- **React 18** with modern hooks
- **Material-UI (MUI)** for beautiful UI components
- **React Router** for navigation
- **Axios** for API communication
- **Recharts** for data visualization
- **Socket.io Client** for real-time updates

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager
- Stripe account (for payments)
- 3CX phone system (for call integration)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd cloud-hotel-system
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 3CX Configuration
THREECX_API_URL=https://your-3cx-server.com:5001/api
THREECX_USERNAME=admin
THREECX_PASSWORD=password
THREECX_TENANT=your-tenant

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 5. Database Setup
Create a PostgreSQL database and run migrations:
```bash
# Create database
createdb hotel_system

# Run migrations (if using Sequelize CLI)
npx sequelize-cli db:migrate

# Seed initial data (optional)
npx sequelize-cli db:seed:all
```

### 6. Start the Application

#### Development Mode
```bash
# Start backend server
npm run dev

# In another terminal, start frontend
cd client
npm start
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Database Configuration
The system uses PostgreSQL with Sequelize ORM. Configure your database connection in the `.env` file.

### Stripe Payment Configuration
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Add the keys to your `.env` file
4. Configure webhook endpoints for payment notifications

### 3CX Phone System Integration
1. Ensure your 3CX system has API access enabled
2. Create API credentials in 3CX Management Console
3. Configure the API URL and credentials in `.env`
4. Set up webhooks for call events

## 👥 User Roles

### Super Admin
- Manage multiple hotels
- Create and manage hotel administrators
- System-wide analytics and reporting
- Full access to all features

### Hotel Admin
- Manage single hotel operations
- Create and manage staff users
- Hotel-specific analytics
- Full access to hotel features

### Manager
- Oversee daily operations
- Manage bookings and guests
- Assign housekeeping tasks
- View reports and analytics

### Receptionist
- Handle check-ins and check-outs
- Manage bookings and payments
- Process guest requests
- Basic reporting access

### Housekeeping
- View and update assigned tasks
- Update room status
- Report maintenance issues
- Limited system access

## 📱 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
GET  /api/auth/me            # Get current user
PUT  /api/auth/me            # Update profile
POST /api/auth/logout        # User logout
```

### Hotel Management
```
GET    /api/hotels           # Get all hotels (super admin)
POST   /api/hotels           # Create hotel
GET    /api/hotels/:id       # Get hotel details
PUT    /api/hotels/:id       # Update hotel
DELETE /api/hotels/:id       # Delete hotel
```

### Room Management
```
GET    /api/rooms/hotel/:hotelId     # Get hotel rooms
POST   /api/rooms                   # Create room
GET    /api/rooms/:id               # Get room details
PUT    /api/rooms/:id               # Update room
DELETE /api/rooms/:id               # Delete room
```

### Booking Management
```
GET    /api/bookings/hotel/:hotelId # Get hotel bookings
POST   /api/bookings                # Create booking
GET    /api/bookings/:id            # Get booking details
PUT    /api/bookings/:id            # Update booking
POST   /api/bookings/:id/checkin    # Check-in guest
POST   /api/bookings/:id/checkout   # Check-out guest
```

### Payment Processing
```
POST   /api/payments/create-intent  # Create Stripe payment intent
POST   /api/payments/cash          # Process cash payment
POST   /api/payments/card          # Process card payment
POST   /api/payments/:id/refund    # Process refund
```

### Housekeeping
```
GET    /api/housekeeping/hotel/:hotelId # Get hotel tasks
POST   /api/housekeeping                # Create task
PUT    /api/housekeeping/:id            # Update task
POST   /api/housekeeping/:id/assign     # Assign task
```

### 3CX Integration
```
GET    /api/3cx/calls/hotel/:hotelId    # Get hotel calls
POST   /api/3cx/calls/outbound          # Make outbound call
PUT    /api/3cx/calls/:id               # Update call record
POST   /api/3cx/webhook/call            # Call webhook endpoint
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- HTTPS enforcement (production)
- Secure password hashing

## 📊 Monitoring & Logging

- Winston logging with file rotation
- Error tracking and reporting
- Performance monitoring
- Database query logging
- API request/response logging

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Set up production environment variables
2. Build the frontend: `npm run build`
3. Start the server: `npm start`
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates
6. Configure database backups

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DB_SSL=true
REDIS_URL=redis://localhost:6379
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client
npm test
```

## 📈 Performance Optimization

- Database indexing for frequently queried fields
- Redis caching for session management
- Image optimization and CDN integration
- API response compression
- Database connection pooling
- Frontend code splitting and lazy loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release with core PMS features
- Booking and guest management
- Housekeeping module
- Payment integration with Stripe
- 3CX phone system integration
- Real-time dashboard and analytics

---

**Built with ❤️ for the hospitality industry**