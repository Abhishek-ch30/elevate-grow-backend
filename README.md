# ElevateGrow Backend API

A production-grade Node.js/Express backend with strict role-based access control (RBAC) and PostgreSQL Row Level Security (RLS).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and navigate to backend**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database 'elevate_grow'
   # Run initialization script
   node db/init.js
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🏗️ Architecture

```
backend/
├── routes/           # Route definitions with middleware
│   ├── public.routes.js    # Public endpoints (signup, login)
│   ├── user.routes.js      # User-only endpoints (/api/user/*)
│   └── admin.routes.js     # Admin-only endpoints (/api/admin/*)
├── controllers/      # Request handlers (no business logic)
│   ├── auth.controller.js  # Authentication controllers
│   ├── user.controller.js  # User controllers
│   └── admin.controller.js # Admin controllers
├── services/         # Business logic with RLS enforcement
│   ├── auth.service.js     # Authentication services
│   ├── user.service.js     # User services (RLS-enforced)
│   └── admin.service.js    # Admin services (full access)
├── middleware/       # Security and validation middleware
│   ├── auth.middleware.js  # JWT authentication
│   ├── role.middleware.js  # Role-based access control
│   └── error.middleware.js # Error handling
├── db/               # Database configuration and policies
│   ├── connection.js       # PostgreSQL connection pool
│   ├── schema.sql         # Database schema
│   ├── init.js           # Database initialization
│   ├── queries/          # SQL query files
│   └── rls/             # Row Level Security policies
└── utils/            # Utilities
    ├── jwt.js             # JWT token utilities
    └── logger.js          # Winston logging
```

## 🔐 Security Features

### Multi-Layer Security
1. **Network**: CORS, Rate Limiting, Security Headers
2. **Authentication**: JWT with signature validation
3. **Authorization**: Role-based middleware
4. **Database**: PostgreSQL Row Level Security (RLS)
5. **Logging**: Comprehensive audit trails

### Role-Based Access Control

#### User Role (`role: 'user'`)
- ✅ View own profile, enrollments, payments, certificates
- ✅ View active training programs
- ✅ Create enrollments and payments
- ❌ **CANNOT** access other users' data
- ❌ **CANNOT** access admin endpoints
- ❌ **CANNOT** modify role or admin status

#### Admin Role (`role: 'admin'`)  
- ✅ Full access to all data
- ✅ Manage users, training programs, enrollments
- ✅ View system statistics and logs
- ✅ All actions are logged for audit

### Non-Reversible Security
- **Client cannot set role/is_admin** - enforced by controllers
- **Database-level enforcement** - RLS policies cannot be bypassed
- **Complete route isolation** - user/admin flows are separate
- **JWT claim validation** - role extracted from signed tokens

## 📡 API Endpoints

### Public Endpoints
```http
POST /api/signup              # User registration
POST /api/login               # Login (user/admin)
POST /api/admin/signup        # Admin registration (requires secret)
GET  /api/health              # Health check
GET  /api/verify-token        # Verify JWT token
```

### User Endpoints (`/api/user/*`)
```http
GET  /api/user/profile        # Get profile
PUT  /api/user/profile        # Update profile
GET  /api/user/enrollments    # Get enrollments
POST /api/user/enrollments    # Create enrollment
GET  /api/user/payments       # Get payments
POST /api/user/payments       # Create payment
GET  /api/user/certificates   # Get certificates
GET  /api/user/dashboard      # Dashboard data
```

### Admin Endpoints (`/api/admin/*`)
```http
GET  /api/admin/users         # List all users
PUT  /api/admin/users/:id/role # Update user role
GET  /api/admin/training-programs # Manage programs
GET  /api/admin/enrollments   # View all enrollments
GET  /api/admin/payments      # Manage payments
POST /api/admin/certificates  # Issue certificates
GET  /api/admin/dashboard     # Admin dashboard
```

## 🔑 Authentication

### User Signup
```javascript
POST /api/signup
{
  "full_name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePass123",
  "phone": 1234567890,
  "profession": "student", // or "professional"
  "college": "Example University"
}

// Response
{
  "status": "success",
  "data": {
    "user": { /* user object */ },
    "token": "eyJ..." // JWT token
  }
}
```

### Admin Signup
```javascript
POST /api/admin/signup
{
  "full_name": "Admin User",
  "email": "admin@example.com",
  "password": "AdminPass123!",
  "adminSecret": "your-admin-secret" // from ENV
}
```

### Login
```javascript
POST /api/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response includes user role and JWT token
```

## 🗃️ Database Schema

### Core Tables
- **`users`** - User accounts with role-based access
- **`training_programs`** - Available training courses
- **`enrollments`** - User course enrollments
- **`payments`** - Payment records and verification
- **`certificates`** - Issued certificates
- **`admin_activity_logs`** - Admin action audit trail

### RLS Policies
Every table has Row Level Security policies that enforce:
- Users only see their own data
- Admins have full access
- No cross-user data leakage possible

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=elevate_grow
DB_USER=postgres  
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# Security
ADMIN_SIGNUP_SECRET=your-admin-signup-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📝 Logging

### Security Events
- Authentication failures
- Invalid token attempts
- RLS policy violations
- Admin privilege attempts

### Admin Activity
All admin actions logged with:
- Action performed
- Resource affected  
- IP address and timestamp
- Complete request details

### HTTP Requests
- Method, URL, status code
- Response time and user info
- Error details (in development)

## 🧪 Development

### Available Scripts
```bash
npm run dev      # Start with nodemon
npm start        # Production start
npm test         # Run tests (when implemented)
npm run db:init  # Initialize database
```

### API Testing
Use the `/api/info` endpoint to see available routes and security features.

## 🚨 Security Checklist

- [x] JWT authentication with secure secrets
- [x] Role-based authorization (RBAC)
- [x] PostgreSQL Row Level Security (RLS)
- [x] Input validation on all endpoints
- [x] Rate limiting and CORS protection
- [x] Security headers via Helmet.js
- [x] Complete audit logging
- [x] Error handling with secure messages
- [x] Non-reversible security architecture

## 📖 Documentation

- **[SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md)** - Complete security documentation
- **API Documentation** - Available at `/api/info` endpoint
- **Database Schema** - See [`db/schema.sql`](./db/schema.sql)
- **RLS Policies** - See [`db/rls/`](./db/rls/) directory

## 🤝 Contributing

1. Follow the established architecture patterns
2. Maintain security boundaries between user/admin code
3. Add appropriate logging and validation
4. Update documentation for any API changes

## ⚠️ Production Deployment

1. **Change all secrets** in environment variables
2. **Use HTTPS** with valid SSL certificates  
3. **Configure rate limiting** based on expected load
4. **Set up database backups** with encryption
5. **Monitor logs** for security events
6. **Update dependencies** regularly

---

**This backend prioritizes SECURITY, AUDITABILITY, and MAINTAINABILITY above all else.**