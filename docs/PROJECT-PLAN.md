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

### Phase 1: Foundation (Week 1) ✅ COMPLETED
- [x] Project structure
- [x] Backend API setup with Express + TypeScript
- [x] Database schema design (comprehensive multi-tenant schema)
- [x] Prisma setup with MySQL
- [x] Authentication system (JWT with access/refresh tokens)
- [x] Organization management API (full CRUD)
- [x] Super admin middleware and auth guards

### Phase 2: Admin Panel Setup (Week 2) ✅ COMPLETED
- [x] Next.js 15 initialization with App Router
- [x] shadcn/ui setup with Tailwind CSS v4
- [x] Login UI with professional design
- [x] Super admin dashboard with stats and layout
- [x] Organizations management page (full CRUD)
- [x] Professional flat UI design (no shadows, clean borders)
- [x] Responsive sidebar with mobile menu
- [x] Authentication flow with Zustand state management

### Phase 3: RBAC & User Management (Week 2-3) ✅ COMPLETED
- [x] User management API (backend complete)
- [x] User management UI (super admin panel)
- [x] Role management API (platform and org-scoped)
- [x] Permission matrix UI (comprehensive 6-level permissions)
- [x] Cross-session permission synchronization
- [x] Permission-based UI controls
- [x] Forbidden/403 page

### Phase 3.5: Organization-Level RBAC (Week 3) 🚧 IN PROGRESS
- [x] Backend: Tenant API routes with org validation middleware
  - [x] Organization module constants (org-modules.ts)
  - [x] Enhanced tenant middleware to block super admins
  - [x] checkOrgPermission middleware for org-scoped permission checks
  - [x] Tenant routes (tenant.routes.ts) with org-scoped role/permission endpoints
  - [x] Updated auth controller to validate orgSlug context during login
- [x] Frontend: Separate login pages
  - [x] Super admin login at `/superadmin/login` (blocks org users)
  - [x] Organization login at `/login` (blocks super admins, auto-redirects to org dashboard)
- [x] Frontend: Organization portal structure
  - [x] `[orgSlug]` directory structure created
  - [x] Organization layout with auth validation and tenant checks
  - [x] Organization dashboard page with org-specific branding
- [ ] Organization role management UI (/:orgSlug/roles)
- [ ] Organization user management UI (/:orgSlug/users)
- [ ] Organization sidebar component with navigation
- [ ] useOrgPermissions hook for org-scoped permission checks
- [ ] Testing: Super admin and org user login isolation
- [ ] Testing: Cross-organization access prevention

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

## Current Status & Next Steps

### ✅ Completed (as of December 7, 2025)

**Backend (kalsohrapi):**
- Express.js API with TypeScript fully configured
- Prisma ORM connected to MySQL database
- JWT authentication with access/refresh tokens
- Super admin authentication middleware
- Organization management API (GET, POST, PUT, DELETE)
- User management API (GET, POST, PUT, DELETE)
- **Role management API** (platform and org-scoped CRUD)
- **Permission management API** (get/update role permissions)
- **Permission middleware** (checkPermission, checkAnyPermission)
- **Tenant context middleware** (validates org and user belongs to it)
- **Organization-scoped permission middleware** (checkOrgPermission)
- **Tenant routes** (/api/tenant/:orgSlug/roles, /api/tenant/:orgSlug/permissions)
- **Enhanced auth controller** (validates orgSlug context during login)
- **Organization module constants** (org-modules.ts)
- Subscription plans and modules API
- CORS, security headers, request logging configured
- Error handling and response utilities

**Frontend (kalsohr-admin):**
- Next.js 15 with App Router and TypeScript
- shadcn/ui components with Tailwind CSS v4
- **Separate login pages**:
  - `/superadmin/login` - For platform administrators (blocks org users)
  - `/login` - For organization users (blocks super admins, redirects to org dashboard)
- Super admin dashboard with gradient designs
- Organizations management with full CRUD operations
- **Organization portal structure** (`/:orgSlug/*`)
  - Organization layout with auth validation
  - Organization dashboard page
  - Tenant validation (prevents cross-org access)
- **User management UI** (create, edit, delete users)
- **Role management UI** (create, edit, delete roles)
- **Permission matrix UI** (6-level granular permissions: read, write, update, delete, approve, export)
- **usePermissions hook** for component-level permission checks
- **Permission-based UI controls** (disabled buttons, hidden features)
- **Forbidden/403 page** for unauthorized access
- **Cross-session permission sync** (30s polling + focus-based refresh)
- Professional flat UI design (removed all shadows)
- Responsive sidebar with mobile support
- Zustand state management for auth with persist
- API client with automatic token refresh and 403 handling
- Form validation with React Hook Form + Zod

**Design System:**
- Gradient text and backgrounds for emphasis
- Flat design with clean borders (no shadows)
- Consistent spacing (gap-6, gap-8 patterns)
- Icon badges with colored backgrounds
- Professional color palette (blue, green, red, gray)
- Responsive grid layouts
- Better form sections with dividers

### 🚧 Next Immediate Tasks

**Phase 3.5 Completion: Organization Portal (Priority 1)**

1. **Organization Sidebar Component**
   - Create org-sidebar.tsx with navigation links
   - Role-based menu items (conditional on permissions)
   - Organization branding (logo, name)
   - User profile dropdown with logout

2. **Organization Role Management**
   - Create `/:orgSlug/roles` page
   - List organization-specific roles
   - Create/edit role dialogs (org-scoped)
   - Permission matrix for org roles
   - API client: lib/api/org-roles.ts

3. **Organization User Management**
   - Create `/:orgSlug/users` page
   - List users within organization
   - Create/edit user dialogs (org-scoped)
   - Assign org roles to users

4. **Organization Permissions Hook**
   - Create useOrgPermissions hook
   - Similar to usePermissions but org-scoped
   - Check permissions against org-specific roles
   - Used for conditional UI rendering in org portal

5. **Testing & Security Validation**
   - Test super admin login (blocks org users) ✓
   - Test organization login (blocks super admins, redirects correctly)
   - Test cross-organization access prevention
   - Verify tenant isolation in API calls
   - Test permission-based UI controls in org portal

**Phase 4: Master Data & Employees (Priority 2)**

6. **Master Data Setup**
   - Departments CRUD (API + UI)
   - Designations CRUD (API + UI)
   - Employment Types CRUD (API + UI)
   - Branches/Locations CRUD (API + UI)

7. **Employee Module**
   - Employee management API
   - Employee listing and search UI
   - Employee profile pages
   - Document upload functionality

### 🐛 Known Issues & Fixes

**Fixed Issues:**
- ✅ Hydration mismatch on body tag (added suppressHydrationWarning)
- ✅ Organization edit API error (removed non-existent module relation)
- ✅ Card shadows removed for flat UI design
- ✅ Proper spacing and professional styling applied

**Potential Improvements:**
- Add loading skeletons instead of "Loading..." text
- Add confirmation dialogs for delete operations
- Add toast notifications for all CRUD operations
- Add pagination component improvements
- Add data export functionality
- Add organization logo upload
- Add email verification flow

## Timeline

**Estimated: 8 weeks for complete MVP**

- Weeks 1-2: Foundation, auth, admin setup
- Weeks 3-5: Core HR modules
- Weeks 6: Recruitment (optional)
- Week 7: Reports and polish
- Week 8: Testing and deployment

## Architecture Decisions Made

### Multi-Tenancy Approach
- **Path-based tenant identification** for better UX and SEO
- **Shared database** with `organization_id` filtering for cost efficiency
- **Prisma middleware** for automatic tenant isolation
- **JWT contains tenant context** for validation at every request

### Authentication Strategy
- **Access tokens**: Short-lived (15 minutes), stored in localStorage
- **Refresh tokens**: Long-lived (7 days), also in localStorage (future: HTTP-only cookies)
- **Token refresh** handled automatically by API client interceptor
- **Super admin** identified by `isSuperAdmin` flag, no organization_id

### UI/UX Decisions
- **Flat design** with no shadows for modern, clean look
- **Gradient accents** for emphasis on headers and buttons
- **Icon badges** with colored backgrounds for better visual hierarchy
- **Consistent spacing** with 6px and 8px gap patterns
- **Professional color system**: Blue (primary), Green (success), Red (danger), Gray (neutral)

### File Structure
- **Backend**: Feature-based (controllers, routes, middleware)
- **Frontend**: Route-based with App Router, co-located components
- **Shared types**: Defined in both backend and frontend for type safety

### Permission Synchronization Strategy
- **Polling mechanism**: Background refresh every 30 seconds
- **Focus-based refresh**: Automatically refreshes when user switches back to tab (5s debounce)
- **Immediate refresh**: When user updates their own role, triggers instant refresh + page reload
- **Cross-session sync**: Permission changes made by admin reflect in all active user sessions
- **Hydration handling**: Prevents redirect issues by waiting for Zustand store to rehydrate from localStorage

This approach balances real-time updates with resource efficiency, without requiring WebSockets or SSE infrastructure.

---

*Last Updated: December 7, 2025*
