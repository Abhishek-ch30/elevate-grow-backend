# ElevateGrow Backend - Security Architecture & Route Mappings

## 🔐 Security Architecture Overview

This backend implements a **production-grade, non-reversible security architecture** with strict role-based access control (RBAC) and PostgreSQL Row Level Security (RLS).

### Core Security Principles

1. **Zero Trust Architecture**: Every request is authenticated and authorized
2. **Defense in Depth**: Multiple security layers (middleware + database + service)
3. **Principle of Least Privilege**: Users access only their own data
4. **Non-Reversible Design**: No way to escalate privileges or bypass controls
5. **Audit Trail**: All admin actions are logged

## 🛡️ Security Layers

### Layer 1: Network & Transport
- **HTTPS Only** (production)
- **CORS Protection** with specific origins
- **Rate Limiting** (100 requests/15min by default)
- **Security Headers** via Helmet.js

### Layer 2: Authentication Middleware
- **JWT Token Validation**
- **Token Expiry Check**
- **Signature Verification**
- **Role Extraction**

### Layer 3: Authorization Middleware  
- **Role-Based Access Control (RBAC)**
- **Route-Level Protection**
- **Resource Ownership Validation**

### Layer 4: Database Security (RLS)
- **Row Level Security Policies**
- **User Context Isolation**
- **Admin-Only Bypass**

### Layer 5: Service Logic
- **Input Validation**
- **Business Rule Enforcement**
- **Audit Logging**

## 🔑 Authentication & Signup Rules

### User Signup (`POST /api/signup`)
```javascript
// ENFORCED BY CONTROLLER - CLIENT CANNOT OVERRIDE
{
  role: 'user',        // HARDCODED
  is_admin: false      // HARDCODED
}
```

### Admin Signup (`POST /api/admin/signup`)
```javascript
// REQUIRES ADMIN_SIGNUP_SECRET ENVIRONMENT VARIABLE
{
  role: 'admin',       // HARDCODED  
  is_admin: true       // HARDCODED
}
```

### Security Guarantees:
- ❌ **Client CANNOT set role or is_admin**
- ❌ **No privilege escalation possible**
- ❌ **No admin creation without secret**
- ✅ **Database constraints enforce integrity**

## 🗺️ Complete Route Mappings

### PUBLIC ROUTES (`/api/*`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/api/signup` | User registration | ❌ | - |
| `POST` | `/api/login` | User/Admin login | ❌ | - |
| `POST` | `/api/logout` | Logout (client-side) | ❌ | - |
| `POST` | `/api/admin/signup` | Admin registration | 🔑 Secret | - |
| `GET`  | `/api/verify-token` | Verify JWT token | ✅ | Any |
| `POST` | `/api/refresh-token` | Refresh JWT token | ✅ | Any |
| `GET`  | `/api/health` | Health check | ❌ | - |
| `GET`  | `/api/info` | API information | ❌ | - |

### USER ROUTES (`/api/user/*`)
**Middleware Stack**: `authenticateToken` → `requireUser` → `RLS Context`

| Method | Endpoint | Description | RLS Policy |
|--------|----------|-------------|------------|
| `GET`  | `/api/user/profile` | Get own profile | `users.user_select` |
| `PUT`  | `/api/user/profile` | Update own profile | `users.user_update` |
| `POST` | `/api/user/change-password` | Change password | N/A |
| `GET`  | `/api/user/training-programs` | List active programs | `training_programs.select` |
| `GET`  | `/api/user/training-programs/:id` | Get program details | `training_programs.select` |
| `GET`  | `/api/user/enrollments` | Get own enrollments | `enrollments.user_own` |
| `POST` | `/api/user/enrollments` | Create enrollment | `enrollments.user_own` |
| `GET`  | `/api/user/payments` | Get own payments | `payments.user_own` |
| `POST` | `/api/user/payments` | Create payment | `payments.user_own` |
| `GET`  | `/api/user/certificates` | Get own certificates | `certificates.user_own` |
| `GET`  | `/api/user/dashboard` | User dashboard | Multiple RLS |

### ADMIN ROUTES (`/api/admin/*`)
**Middleware Stack**: `authenticateToken` → `requireAdmin` → `logAdminActivity` → `RLS Context`

| Method | Endpoint | Description | RLS Policy | Logging |
|--------|----------|-------------|------------|---------|
| `GET`  | `/api/admin/profile` | Get admin profile | `users.admin_all` | ❌ |
| `POST` | `/api/admin/change-password` | Change password | N/A | ✅ |
| `GET`  | `/api/admin/users` | List all users | `users.admin_all` | ❌ |
| `GET`  | `/api/admin/users/:id` | Get user by ID | `users.admin_all` | ❌ |
| `PUT`  | `/api/admin/users/:id/role` | Update user role | `users.admin_all` | ✅ |
| `GET`  | `/api/admin/training-programs` | List all programs | `training_programs.admin_all` | ❌ |
| `POST` | `/api/admin/training-programs` | Create program | `training_programs.admin_all` | ✅ |
| `PUT`  | `/api/admin/training-programs/:id` | Update program | `training_programs.admin_all` | ✅ |
| `GET`  | `/api/admin/enrollments` | List all enrollments | `enrollments.admin_all` | ❌ |
| `PUT`  | `/api/admin/enrollments/:id/status` | Update enrollment | `enrollments.admin_all` | ✅ |
| `GET`  | `/api/admin/payments` | List all payments | `payments.admin_all` | ❌ |
| `PUT`  | `/api/admin/payments/:id/status` | Update payment | `payments.admin_all` | ✅ |
| `GET`  | `/api/admin/certificates` | List all certificates | `certificates.admin_all` | ❌ |
| `POST` | `/api/admin/certificates` | Create certificate | `certificates.admin_all` | ✅ |
| `GET`  | `/api/admin/activity-logs` | View activity logs | `admin_activity_logs.admin_only` | ❌ |
| `GET`  | `/api/admin/dashboard` | Admin dashboard | Multiple RLS | ❌ |
| `GET`  | `/api/admin/system/health` | System health | N/A | ❌ |
| `GET`  | `/api/admin/system/stats` | System statistics | N/A | ❌ |

## 🔒 PostgreSQL RLS Policies

### Users Table
```sql
-- Users can only see their own record OR admin sees all
CREATE POLICY users_user_select ON users FOR SELECT
USING (current_setting('rls.current_user_role') = 'admin' 
       OR (current_setting('rls.current_user_role') = 'user' 
           AND id::text = current_setting('rls.current_user_id')));

-- Users can only update their own record (role/is_admin protected)
CREATE POLICY users_user_update ON users FOR UPDATE
WITH CHECK (current_setting('rls.current_user_role') = 'admin'
            OR (current_setting('rls.current_user_role') = 'user'
                AND role = 'user' AND is_admin = false));
```

### Training Programs Table
```sql
-- Users see active programs, admins see all
CREATE POLICY training_programs_select ON training_programs FOR SELECT
USING (current_setting('rls.current_user_role') = 'admin'
       OR (current_setting('rls.current_user_role') = 'user' 
           AND is_active = true));
```

### Enrollments/Payments/Certificates Tables
```sql
-- Users only see their own records, admins see all
CREATE POLICY table_user_own ON table_name FOR ALL
USING (current_setting('rls.current_user_role') = 'admin'
       OR (current_setting('rls.current_user_role') = 'user'
           AND user_id::text = current_setting('rls.current_user_id')));
```

## 🚫 Reverse Engineering Prevention

### 1. **No Role Trust from Client**
- Client cannot set `role` or `is_admin` fields
- Controllers explicitly remove these from request body
- Database constraints enforce role integrity

### 2. **Database-Level Enforcement**
- RLS policies run at PostgreSQL level
- Cannot be bypassed by application logic
- Requires database-level privileges to modify

### 3. **Route Isolation**
- Complete separation between user and admin routes
- Different middleware stacks prevent cross-contamination
- No shared endpoints between roles

### 4. **JWT Claim Validation**
- Token payload validated on every request
- Role extracted from cryptographically signed token
- Token tampering results in signature validation failure

### 5. **Service Layer Separation**
- [`user.service.js`](backend/services/user.service.js) - RLS-enforced queries
- [`admin.service.js`](backend/services/admin.service.js) - Full access queries
- No shared service methods between roles

## 🔍 Audit & Monitoring

### Admin Activity Logging
All admin actions are logged to `admin_activity_logs` table:
- **Action**: What was performed
- **Resource**: What was affected
- **Details**: Request parameters and body
- **IP Address**: Source IP
- **Timestamp**: When action occurred

### Security Event Logging
Security events are logged via Winston:
- Authentication failures
- Invalid token attempts  
- RLS policy violations
- Admin privilege escalations

### Request Logging
All HTTP requests logged with:
- Method, URL, Status Code
- Response time
- User information (if authenticated)
- IP address and User-Agent

## 🛠️ Development & Deployment

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432  
DB_NAME=elevate_grow
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Admin Protection
ADMIN_SIGNUP_SECRET=your-admin-signup-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Database Setup
```bash
# Initialize database with tables and RLS policies
cd backend
node db/init.js
```

### Running the Server
```bash
# Development
npm run dev

# Production  
npm start
```

## ✅ Security Checklist

- [x] **Authentication**: JWT-based with secure token validation
- [x] **Authorization**: Role-based access control (RBAC)  
- [x] **Data Isolation**: PostgreSQL Row Level Security (RLS)
- [x] **Input Validation**: Express-validator on all inputs
- [x] **Rate Limiting**: Configurable request throttling
- [x] **Security Headers**: Helmet.js protection
- [x] **Audit Logging**: Complete admin activity tracking
- [x] **Error Handling**: Secure error messages
- [x] **Non-Reversible**: No privilege escalation possible
- [x] **Route Isolation**: Complete separation of user/admin flows

## 🚨 Security Warnings

1. **NEVER expose JWT_SECRET** in client-side code
2. **ALWAYS use HTTPS** in production
3. **ROTATE admin secrets** regularly
4. **MONITOR activity logs** for suspicious behavior
5. **BACKUP database** with encryption
6. **UPDATE dependencies** regularly for security patches

---

**This backend is designed to be DETERMINISTIC, READABLE, and AUDITABLE with NO security shortcuts or vulnerabilities.**







INSERT INTO "users" (
    "id", 
    "full_name", 
    "email", 
    "password", 
    "role", 
    "is_admin", 
    "created_at", 
    "updated_at"
) VALUES (
    gen_random_uuid(),
    'New Admin User',
    'newadmin@qthink.com',
    '$2a$12$sItwpmM9rtrzzR1n9k11QO1WwEDDXUM9Fz4TMTbBYVgL5/sbrk85O', -- Hash for 'Password@123'
    'admin', 
    true, 
    NOW(), 
    NOW()
);


12 - Cost factor