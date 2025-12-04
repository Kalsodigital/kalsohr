# KalsoHR - Multi-Tenant HR Management SaaS

A modern, enterprise-grade HR management platform built with Next.js, Node.js, and MySQL.

## Features

- 🏢 **Multi-Tenant Architecture** - Complete data isolation per organization
- 🔐 **Advanced RBAC** - Role-based access control with granular permissions
- 👥 **Employee Management** - Comprehensive employee profiles and document management
- 📅 **Attendance Tracking** - Daily attendance with multiple status types
- 🏖️ **Leave Management** - Leave requests, approvals, and balance tracking
- 💼 **Recruitment Module** - Job postings, candidate pipeline, interview scheduling
- 📊 **Reports & Analytics** - Pre-built reports with export capabilities
- 🎨 **Modern UI** - Built with Next.js 15 and shadcn/ui

## Tech Stack

### Backend
- **Node.js** 20+ with TypeScript
- **Express.js** - Web framework
- **Prisma** - Type-safe ORM
- **MySQL** 8+ - Database
- **JWT** - Authentication with HTTP-only cookies
- **Zod** - Schema validation
- **Multer** - File uploads

### Frontend
- **Next.js** 15 (App Router)
- **React** 19 with Server Components
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **React Hook Form** + Zod - Form management
- **TanStack Table** - Data tables
- **Zustand** - State management

## Project Structure

```
kalsohr/
├── kalsohrapi/          # Backend API
├── kalsohr-admin/       # Frontend (Admin + Employee portal)
└── docs/                # Documentation
```

## Prerequisites

-Node.js 20+ and npm
- MySQL 8+
- Git

## Quick Start

### 1. Clone the Repository

```bash
cd /Users/gokulprasad/Desktop/mymac/dev/kalsohr
```

### 2. Database Setup

```bash
# Login to MySQL
mysql -u sowmi -p
# Password: Jobs@1487

# Create database
CREATE DATABASE kalsohr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend Setup

```bash
cd kalsohrapi

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run Prisma migrations
npx prisma migrate dev

# Seed database
npm run seed

# Start development server
npm run dev
```

API will run on `http://localhost:3000`

### 4. Frontend Setup

```bash
cd kalsohr-admin

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with API URL

# Start development server
npm run dev
```

Admin panel will run on `http://localhost:3001`

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="mysql://sowmi:Jobs@1487@localhost:3306/kalsohr_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

## Default Super Admin Credentials

After seeding the database:

- **Email:** superadmin@kalsohr.com
- **Password:** Admin@123
- **Role:** Super Admin

**⚠️ Change these credentials immediately after first login!**

## Development Workflow

### Running Both Apps

```bash
# Terminal 1 - Backend
cd kalsohrapi && npm run dev

# Terminal 2 - Frontend
cd kalsohr-admin && npm run dev
```

### Database Migrations

```bash
cd kalsohrapi

# Create a new migration
npx prisma migrate dev --name description_of_changes

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## Multi-Tenant Setup

### Creating an Organization (Super Admin)

1. Login as super admin
2. Navigate to Organizations
3. Click "Add Organization"
4. Fill in details and select subscription plan
5. Organization is created with default roles
6. First org admin user is auto-created

### Default Roles Per Organization

When an organization is created, these roles are automatically seeded:

1. **Organization Admin** - Full access to all modules
2. **HR Manager** - Manage employees, attendance, leave, recruitment
3. **Manager** - View reports, approve leave requests
4. **Employee** - Self-service access only

## API Documentation

API docs are available at `http://localhost:3000/api-docs` when running in development.

Key API patterns:

```
# Authentication
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

# Super Admin
GET  /api/superadmin/organizations
POST /api/superadmin/organizations

# Tenant Routes (all prefixed with /:orgSlug)
GET  /api/:orgSlug/employees
POST /api/:orgSlug/employees
GET  /api/:orgSlug/attendance
POST /api/:orgSlug/leave/requests
```

## Testing

```bash
# Backend tests
cd kalsohrapi
npm test

# Frontend tests
cd kalsohr-admin
npm test

# E2E tests
npm run test:e2e
```

## Production Deployment

### Using Docker

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Deployment (Hostinger VPS)

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## Documentation

- [Project Plan](./docs/PROJECT-PLAN.md) - Complete project roadmap
- [Database Schema](./docs/DATABASE-SCHEMA.md) - Detailed schema documentation
- [Bawa App Reference](./docs/BAWA-APP-FIELDS-REFERENCE.md) - Field mappings from original app
- [API Documentation](./docs/API-DOCS.md) - API endpoints and usage
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions

## Project Status

**Current Phase:** Foundation Setup (Week 1)

- [x] Project structure created
- [x] Documentation written
- [ ] Backend API initialization
- [ ] Database schema implementation
- [ ] Authentication system
- [ ] Frontend initialization

See [PROJECT-PLAN.md](./docs/PROJECT-PLAN.md) for complete timeline.

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for modern HR management**

*Last Updated: December 4, 2025*
