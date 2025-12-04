# KalsoHR - Multi-Tenant HR Management SaaS

## Project Overview

KalsoHR is a modern, multi-tenant HR management platform built from the ground up with enterprise-grade security, flexibility, and scalability.

### Core Features
- Multi-tenant architecture with complete data isolation
- Two-level RBAC (Platform + Tenant-specific)
- Employee management with self-service portal
- Attendance and leave management
- Recruitment module (optional)
- Subscription-based access control
- Module enable/disable per organization

### Technology Stack

**Backend (kalsohrapi):**
- Node.js 20+ with TypeScript
- Express.js framework
- Prisma ORM
- MySQL 8+
- JWT authentication with HTTP-only cookies
- Zod validation
- Multer for file uploads
- Nodemailer for emails

**Frontend (kalsohr-admin):**
- Next.js 15 (App Router with React Server Components)
- shadcn/ui + Radix UI
- Tailwind CSS
- React Hook Form + Zod
- TanStack Table
- Zustand for state management
- Recharts for analytics

## Project Structure

```
kalsohr/
├── kalsohrapi/              # Backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation, tenant context
│   │   ├── utils/          # Helpers
│   │   └── config/         # Configuration
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── uploads/            # File storage
│   ├── Dockerfile
│   └── package.json
│
├── kalsohr-admin/           # Frontend (Admin + Employee portal)
│   ├── app/
│   │   ├── login/          # Login page
│   │   ├── superadmin/     # Super admin dashboard
│   │   └── [orgSlug]/      # Tenant-specific routes
│   │       ├── dashboard/
│   │       ├── employees/
│   │       ├── attendance/
│   │       ├── leave/
│   │       ├── recruitment/
│   │       ├── settings/
│   │       └── my/         # Employee self-service
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   └── shared/         # Shared components
│   ├── lib/                # Utilities
│   ├── hooks/              # Custom hooks
│   ├── types/              # TypeScript types
│   └── package.json
│
└── docs/                    # Documentation
    ├── PROJECT-PLAN.md     # This file
    ├── DATABASE-SCHEMA.md
    ├── API-DOCS.md
    └── DEPLOYMENT.md
```

## Multi-Tenancy Architecture

### Path-Based Tenant Identification
- API: `/api/:orgSlug/employees`
- Frontend: `/:orgSlug/employees`
- Organization slug extracted from URL and validated

### Data Isolation Strategy
- All tenant tables have `organization_id` column
- Prisma middleware automatically filters queries by organization
- Foreign key constraints prevent cross-tenant access
- Composite indexes on `(organization_id, id)` for performance

### Authentication Flow
1. User enters email + password + org slug
2. API validates credentials
3. JWT generated with: userId, orgId, roleId, permissions
4. JWT stored in HTTP-only cookie
5. All subsequent requests include cookie
6. Middleware extracts tenant context from JWT + URL

## Role-Based Access Control (RBAC)

### Two-Level Permission System

**Level 1: Platform (Super Admin)**
- Super admin users have `is_super_admin = true`
- No organization_id (platform-level accounts)
- Can access all organizations
- Can create/manage organizations
- Can create platform-level roles and users

**Level 2: Tenant (Organization)**
- All users have `organization_id`
- Can only access their organization's data
- Roles are organization-specific
- Each org can create custom roles

### Default Role Templates

When an organization is created, these roles are auto-seeded:

1. **Organization Admin**
   - Full access to all modules
   - Can manage users and roles
   - Cannot be deleted (is_system = true)

2. **HR Manager**
   - Full access: Employees, Attendance, Leave, Recruitment
   - Read/Write: Master Data
   - Read Only: Reports

3. **Manager**
   - Read Only: Employees
   - Read/Write: Attendance, Leave (for approval)
   - Read Only: Reports

4. **Employee**
   - Self-service only
   - Access to /my/* routes
   - View own attendance, apply leave, edit profile

### Permission Presets

For easier role management, we provide presets:

- **No Access** - Can't see the module
- **Read Only** - View only
- **Read & Write** - View + Create (but not edit/delete)
- **Full Access** - All permissions
- **Custom** - Granular control (read, write, update, delete)

### Module System

**Core Modules (always enabled):**
- Dashboard
- Employees
- Attendance
- Leave Management
- Master Data
- Reports

**Optional Modules (can be enabled per org):**
- Recruitment
- Payroll (future)
- Performance Reviews (future)
- Assets Management (future)

Modules can be tied to subscription plans.

## Database Schema Overview

### Core Tables

**organizations**
- Tenant master table
- subscription_plan_id, max_users, max_storage
- is_active, subscription_expiry

**subscription_plans**
- Plan definitions (Basic, Premium, Enterprise)
- Features and limits

**organization_modules**
- Track enabled modules per org
- organization_id + module_name + is_enabled

**users**
- All users (super admin + org users)
- organization_id (NULL for super admin)
- is_super_admin flag
- role_id

**roles**
- organization_id (NULL for platform roles)
- name, description
- is_system (cannot be deleted)

**role_permissions**
- role_id + module_name
- can_read, can_write, can_update, can_delete

**modules**
- System-defined module list
- is_core (core vs optional)

### Master Data Tables (Org-specific)
- departments
- designations
- employment_types
- branches (stores/locations)

All have `organization_id`

### HR Tables (Org-specific)
- employees
- employee_documents
- attendance
- leave_types
- leave_requests
- leave_approvals

### Recruitment Tables (Org-specific, Optional Module)
- job_positions
- candidates
- applications
- interview_schedules
- interview_feedback

## Development Phases

### Phase 1: Foundation (Week 1) ✓
- [x] Project structure
- [ ] Backend API setup
- [ ] Database schema design
- [ ] Prisma setup
- [ ] Authentication system
- [ ] Organization management API

### Phase 2: Admin Panel Setup (Week 2)
- [ ] Next.js initialization
- [ ] shadcn/ui setup
- [ ] Login UI
- [ ] Super admin dashboard
- [ ] Tenant layout and navigation

### Phase 3: RBAC & User Management (Week 2-3)
- [ ] Role management API
- [ ] User management API
- [ ] Permission matrix UI
- [ ] User invitation flow

### Phase 4: Master Data & Employees (Week 3-4)
- [ ] Master data CRUD (API + UI)
- [ ] Employee management (API + UI)
- [ ] Document upload
- [ ] Employee search and filters

### Phase 5: Attendance & Leave (Week 4-5)
- [ ] Attendance module (API + UI)
- [ ] Leave management (API + UI)
- [ ] Approval workflows

### Phase 6: Employee Self-Service (Week 5)
- [ ] Employee dashboard
- [ ] Self-service features
- [ ] Mobile-responsive design

### Phase 7: Recruitment Module (Week 6)
- [ ] Job positions
- [ ] Candidate pipeline
- [ ] Interview scheduling

### Phase 8: Reports & Polish (Week 7)
- [ ] Reporting engine
- [ ] Notifications
- [ ] Subscription enforcement

### Phase 9: Testing & Deployment (Week 8)
- [ ] Unit and integration tests
- [ ] E2E tests
- [ ] Docker setup
- [ ] Production deployment

## API Routes Structure

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### Super Admin
- `GET /api/superadmin/organizations`
- `POST /api/superadmin/organizations`
- `GET /api/superadmin/organizations/:id`
- `PUT /api/superadmin/organizations/:id`
- `DELETE /api/superadmin/organizations/:id`

### Tenant Routes (all prefixed with /:orgSlug)
- `/api/:orgSlug/employees`
- `/api/:orgSlug/attendance`
- `/api/:orgSlug/leave`
- `/api/:orgSlug/departments`
- `/api/:orgSlug/users`
- `/api/:orgSlug/roles`
- etc.

## Security Considerations

1. **SQL Injection Prevention** - Prisma parameterized queries
2. **XSS Prevention** - React auto-escaping + CSP headers
3. **CSRF Prevention** - SameSite cookies + CSRF tokens
4. **Rate Limiting** - Express rate limit middleware
5. **JWT Security** - HTTP-only cookies, short expiry
6. **File Upload Security** - Type validation, size limits, sanitization
7. **Tenant Isolation** - Automatic filtering via Prisma middleware
8. **Role Validation** - Every endpoint checks permissions

## Deployment Strategy

### Development
- Local MySQL database
- `npm run dev` for hot reload
- Environment: `.env.local`

### Production (Hostinger VPS)
- Docker containers for all services
- Docker Compose for orchestration
- Nginx reverse proxy
- MySQL in container or managed service
- PM2 for process management (fallback)
- Automated backups
- SSL with Let's Encrypt
- CI/CD with GitHub Actions

## Next Steps

1. Initialize backend API project
2. Set up Prisma with MySQL
3. Design and create database schema
4. Implement authentication system
5. Build organization management
6. Initialize Next.js admin app
7. Continue with phases...

## Timeline

**Estimated: 8 weeks for complete MVP**

- Weeks 1-2: Foundation, auth, admin setup
- Weeks 3-5: Core HR modules
- Weeks 6: Recruitment (optional)
- Week 7: Reports and polish
- Week 8: Testing and deployment

---

*Last Updated: December 4, 2025*
