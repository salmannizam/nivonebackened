# Hostel Management Backend API

NestJS-based REST API for Hostel/PG Management System with multi-tenant SaaS support.

## 🏗️ Architecture

- **Framework**: NestJS 10
- **Database**: MongoDB 8
- **Cache/Queue**: Redis Sentinel (High Availability)
- **Authentication**: JWT + Refresh Tokens

## 🚀 Features

- ✅ Multi-tenant architecture (always enabled)
- ✅ Tenant isolation at database level
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (OWNER, MANAGER, STAFF)
- ✅ Super Admin for platform management
- ✅ Complete CRUD for all modules
- ✅ Redis Sentinel for high availability
- ✅ Feature flags and plan limits
- ✅ Multi-tenant SaaS architecture

## 📦 Modules

- **Auth**: Authentication & authorization
- **Tenants**: Tenant management
- **Users**: User & role management
- **Super Admin**: Platform management
- **Buildings**: Building management
- **Rooms**: Room & bed management
- **Residents**: Resident management with check-in/check-out
- **Payments**: Payment tracking
- **Complaints**: Complaints & maintenance
- **Visitors**: Visitor logs
- **Notices**: Notices & announcements
- **Reports**: Analytics & reporting

## 🛠️ Setup

### Prerequisites

- Node.js 20+
- MongoDB 8
- Redis with Sentinel

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy .env file and edit with your configuration
   # See .env.example for required variables
   ```

3. **Seed database**
   ```bash
   # Create Super Admin
   npm run seed:admin
   ```

4. **Start development server**
   ```bash
   npm run start:dev
   ```

5. **API will be available at**
   - http://localhost:3001/api

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hostel_management
MONGODB_DB_NAME=hostel_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Redis Sentinel
REDIS_SENTINEL_HOSTS=localhost:26379,localhost:26380,localhost:26381
REDIS_SENTINEL_NAME=mymaster
REDIS_PASSWORD=
REDIS_DB=0

# CORS
CORS_ORIGIN=http://localhost:3000

# URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Self-hosted (only when APP_MODE=SELF_HOSTED)
SELF_HOSTED_TENANT_NAME=Default Organization
SELF_HOSTED_TENANT_SLUG=default

# Super Admin (only when APP_MODE=SAAS)
SUPER_ADMIN_EMAIL=admin@platform.com
SUPER_ADMIN_PASSWORD=superadmin123
SUPER_ADMIN_NAME=Platform Administrator
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/me` - Get current user

### Super Admin (SaaS only)
- `POST /api/admin/auth/login` - Super Admin login
- `GET /api/admin/tenants` - List all tenants
- `POST /api/admin/tenants` - Create tenant
- `GET /api/admin/tenants/stats` - Platform statistics

### Resources
- `GET /api/buildings` - List buildings
- `GET /api/rooms` - List rooms
- `GET /api/residents` - List residents
- `GET /api/payments` - List payments
- `GET /api/complaints` - List complaints
- `GET /api/visitors` - List visitors
- `GET /api/notices` - List notices
- `GET /api/reports/dashboard` - Dashboard stats

All endpoints require authentication except `/api/auth/login` and `/api/auth/register`.

## 🔐 Multi-Tenancy

### SaaS Mode (`APP_MODE=SAAS`)
- Tenant detected from subdomain: `{tenant-slug}.yourdomain.com`
- Subdomain maps to tenant record in database
- Supports unlimited tenants
- Super Admin available for platform management

### Self-Hosted Mode (`APP_MODE=SELF_HOSTED`)
- Single default tenant (auto-created on first request)
- No subdomain logic required
- Full feature access
- Super Admin disabled

### Tenant Isolation
- Every collection includes `tenantId` field
- All queries automatically filtered by `tenantId`
- Middleware injects `tenantId` into request context
- No cross-tenant data access possible

## 🌱 Database Seeding

### Default Tenant & Admin User
```bash
npm run seed
```

Creates:
- Default tenant (name: "Default Organization", slug: "default")
- Admin user (email: "admin@example.com", password: "admin123", role: "OWNER")

### Super Admin (SaaS Mode Only)
```bash
# Set APP_MODE=SAAS in .env first
npm run seed:super-admin
```

Creates:
- Super Admin user (email: "admin@platform.com", password: "superadmin123", role: "SUPER_ADMIN")

**Note**: Change default passwords after first login!

## 📝 Scripts

- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run start:dev` - Start development server
- `npm run start:debug` - Start with debugging
- `npm run lint` - Run linter
- `npm run seed` - Seed default tenant and admin
- `npm run seed:super-admin` - Seed Super Admin (SaaS mode only)

## 🚀 Deployment

### VPS Deployment

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Edit .env with your settings
   ```

4. **Seed database**
   ```bash
   npm run seed
   ```

5. **Build and start**
   ```bash
   npm run build
   npm run start:prod
   ```

## 🔒 Security

- JWT-based authentication
- Refresh token rotation
- Password hashing with bcrypt
- Role-based access control
- Input validation with class-validator
- CORS configuration
- Tenant isolation

---

**Backend API - Deploy independently on your VPS**
# nivonebackened
