# KalsoHR - Project Handover Document

**Last Updated:** December 31, 2025
**Project Status:** 98% Complete
**Version:** 2.3

---

## 📊 PROJECT STATUS SUMMARY

### ✅ FULLY IMPLEMENTED (96%)

#### 1. Super Admin Portal - 100% Complete
- **Organizations Management**
  - Create, edit, delete organizations
  - Organization classification (Type, Industry, Category)
  - Location management (Country, State, City with cascading dropdowns)
  - Subscription plan assignment
  - Module assignment from plan
  - Status management (active, suspended, inactive)
  - Search and pagination
  - Audit tracking with hover card info icon

- **Subscription Plans Management**
  - Full CRUD UI with create/edit/delete dialogs
  - Module assignment to plans (with core module protection)
  - Plan limits configuration (users, employees, storage)
  - **✅ Limit enforcement** - Backend validation prevents exceeding plan limits
  - Pricing management (monthly/yearly)
  - Search and filters with inline stats bar
  - Organization count per plan
  - Status toggles (active/inactive)

- **Master Data Management (All Pages)**
  - Organization Types, Industry Types, Business Categories
  - Countries (with ISO codes and phone codes)
  - States (linked to countries), Cities (linked to states)
  - Genders, Blood Groups, Religions, Marital Status
  - Education Levels, Document Types
  - **✅ Permission-based audit info icon** - Only shows for users with approve permission

- **Platform Roles & Permissions**
  - Role CRUD with system role protection
  - Permission matrix management (9 modules × 6 permissions)
  - Module dependency auto-selection
  - Visual indicators for locked dependencies
  - Permission synchronization on role updates

- **Accounts Management**
  - Super admin user management
  - Role assignment
  - Status management

#### 2. Organization Portal - 100% Complete

- **Organization Sidebar Navigation**
  - Role-based menu items
  - Dashboard, Roles, Users, Employees, Settings
  - Profile dropdown with logout
  - Organization name display
  - Mobile responsive
  - **✅ Theme support** - Dynamic organization theme colors

- **Organization Roles Management**
  - Full CRUD for org-scoped roles
  - Permission management with org modules
  - User count and permission count per role
  - Search and filters
  - System role protection

- **Organization Users Management**
  - Full CRUD for org users
  - Role assignment
  - Status management (active/inactive)
  - **✅ Subscription limit enforcement** - Cannot create users beyond plan limit
  - **✅ Disabled button with tooltip** - Shows limit info when reached
  - **✅ Inline stats bar** - Simplified stats display matching subscription page
  - Search by name/email with role and status filters
  - Pagination support
  - Email verification badges
  - Last login tracking

#### 3. Employee Management Module - 100% Complete ✨

**Backend (kalsohrapi):**
- ✅ Employee controller with full CRUD operations
- ✅ API endpoints for all employee operations
- ✅ File upload handling (profile pictures, documents)
- ✅ Date field conversion for Prisma compatibility
- ✅ **MySQL-compatible search** - Removed PostgreSQL-specific `mode: 'insensitive'`
- ✅ **Debounced search** - 500ms delay to prevent excessive API calls
- ✅ **Subscription limit enforcement** - Validates maxEmployees before create/reactivate
- ✅ Sibling management with cascade operations
- ✅ Pagination support
- ✅ Permission-based access control

**Frontend (kalsohr-admin):**
- ✅ Employee list page with modern UI
  - **✅ Debounced search** - Separate searchInput and searchQuery states
  - **✅ Inline stats bar** - Stats on left, search/filters on right
  - Filter by department, designation, status, branch, employment type
  - Collapsible advanced filters
  - Stats: Total, Active, On Leave, Terminated/Resigned
  - Pagination with React.Fragment keys
  - Create/Edit/Delete actions with permission checks
  - Status badges with color coding
  - **✅ Blue gradient avatars** - Consistent employee profile pictures

- ✅ Create Employee Dialog (4-Step Wizard)
  - **✅ Light grey header** - Clean background instead of blue gradient
  - **✅ No confirmation screen** - Submit directly from step 4
  - **✅ Submit button on step 4 only** - Cleaner UX flow
  - Step 1: Basic Information (Profile picture, personal details, contact)
  - Step 2: Employment Details (Department, designation, salary, status)
  - Step 3: Personal & Family (Address, family details, siblings, emergency contact)
  - Step 4: Documents & Banking (Government IDs, bank details)
  - Auto-generate employee code
  - Auto-fill dummy data for testing
  - City-based auto-fill for state/country
  - Conditional "Date of Leaving" field

- ✅ Edit Employee Dialog (Same 4-step wizard with pre-populated data)

- ✅ Employee Profile/View Page
  - Header with profile picture, status, contact, dates
  - Tabbed interface (Overview, Employment, Personal, Documents, Family)
  - Edit and Delete buttons (permission-based)

**Modern UI Features:**
- Card-based sections with subtle gradients
- Icon integration with all labels
- Enhanced step indicators with icons
- Improved spacing and typography
- Subtle scrollbar styling (6px, light gray)
- Mobile-responsive design

#### 4. Recruitment Module - Candidate Comments System - 100% Complete ✨

**Backend (kalsohrapi):**
- ✅ `CandidateComment` model with self-referential threading
- ✅ Comment controller with 4 API endpoints (GET, POST, PUT, DELETE)
- ✅ Single-level threading (comments → replies, no deep nesting)
- ✅ Section-based organization (13+ section keys across all tabs)
- ✅ Star ratings (1-5) for top-level comments only
- ✅ User attribution with timestamps
- ✅ Ownership validation (only authors can edit/delete)
- ✅ Permission-based access control (recruitment permissions)
- ✅ Comment count aggregation by section key
- ✅ **CRITICAL BUG FIX:** Corrected `sendSuccess()` parameter order
  - Issue: Message and data parameters were swapped
  - Impact: API was returning message string as data
  - Fixed in: `comment.controller.ts` lines 88-91, 195, 283, 323

**Frontend (kalsohr-admin):**
- ✅ 6 new comment components in `/app/[orgSlug]/recruitment/candidates/[id]/components/`
  - `star-rating.tsx` - Interactive 1-5 star rating input
  - `comment-form.tsx` - Form with textarea + star rating
  - `comment-item.tsx` - Individual comment display with actions
  - `comment-thread.tsx` - List of comments with nested replies
  - `section-comments-dialog.tsx` - Main modal container
  - `section-comments-icon.tsx` - Badge icon trigger button
- ✅ Comment badges on all 13+ section cards
  - Shows count of comments per section
  - Positioned top-right on each card header
  - Click to open comments dialog
- ✅ Comment dialog features:
  - Scrollable comment thread
  - Fixed comment form at bottom
  - User avatars and names
  - Relative timestamps ("8 minutes ago")
  - Star ratings display
  - Reply functionality
  - Empty state ("No comments yet")
- ✅ Full CRUD operations
  - Create comments with optional ratings
  - Reply to comments (single-level only)
  - Edit own comments
  - Delete own comments

**Section Coverage:**
- **Overview Tab (4 sections):** Quick Info, Contact Info, Application Details, Notes
- **Professional Tab (3 sections):** Professional Info, Education, Skills
- **Personal Tab (2 sections):** Personal Info, Address Info
- **Family Tab (4 sections):** Father Info, Mother Info, Emergency Contact, Family Address

**Technical Implementation:**
- Database: Self-referential `parentCommentId` for single-level threading
- API: RESTful design with proper HTTP methods
- Validation: Comment length (1-5000 chars), Rating (1-5), Nested reply prevention
- Security: Ownership checks, Permission middleware
- Performance: Indexed queries on (candidateId, sectionKey)
- Data Flow: Backend → API Client → React Components → UI

#### 5. Authentication & Authorization - 100% Complete

- **Dual Login System**
  - `/superadmin/login` for platform admins
  - `/login` for organization users
  - JWT token-based authentication
  - Secure password hashing
  - Session management with Zustand store

- **Permission System**
  - Two-level RBAC (Platform + Organization)
  - Module-based permissions (9 platform + 11 org modules)
  - 6-level permission actions (Read, Write, Update, Delete, Approve, Export)
  - Permission checks at page and button level
  - Module dependency enforcement
  - **✅ Audit info permission check** - Only shows for users with approve permission
  - Middleware protection on all routes

---

## 🎨 RECENT IMPROVEMENTS

### December 31, 2025 - Organization Settings, Timezone Support & Bug Fixes

1. **Organization Timezone Settings**
   - Added timezone field to Organization model in database schema
   - Created comprehensive Organization Settings page (`/[orgSlug]/settings/organization`)
   - Timezone selector with 22+ major timezones (Asia, Europe, Americas, Pacific, Australia)
   - Real-time preview showing current date/time in selected timezone
   - IANA timezone validation on backend
   - Settings hub page with navigation to different settings sections
   - Permission-based access control (requires 'settings' module access)

2. **Interview Date Timezone Fix** 🐛
   - **Critical Bug:** Interview scheduling was shifting dates by one day
   - **Root Cause:** datetime-local input sent date without timezone info
   - **Fix:** Convert datetime-local to ISO string with timezone before sending to API
   - **Location:** `create-interview-dialog.tsx` lines 119-121
   - **Impact:** Interview dates now save correctly in user's local timezone

3. **Super Admin Permissions Fix** 🔒
   - **Issue:** Main Super Admin couldn't access Organizations page
   - **Root Cause:** Super Admin user had roleId=1 (Platform Admin) assigned
   - **Fix:** Removed role assignment - Super Admin should have roleId=null for full access
   - **Permission Logic:** Super Admins without roles get unrestricted platform access
   - **Verified:** Backend middleware correctly grants full access when `isSuperAdmin && !roleId`

4. **Recruitment Kanban Board UI Enhancements**
   - Changed "Interview Scheduled" column title to "Interviews" (more concise)
   - Updated "Applied" column color from blue to slate for better visual balance
   - Maintained drag-and-drop functionality with @dnd-kit library
   - Consistent color scheme across all status columns

**Files Modified:**
- `kalsohrapi/prisma/schema.prisma` - Added timezone field (line 81)
- `kalsohr-admin/app/[orgSlug]/settings/organization/page.tsx` - New settings page
- `kalsohr-admin/app/[orgSlug]/settings/page.tsx` - New settings hub
- `kalsohr-admin/lib/types/organization.ts` - Added timezone to types
- `kalsohr-admin/lib/api/org/organization.ts` - Added updateOrganizationSettings
- `kalsohrapi/src/controllers/organization.controller.ts` - New settings endpoint
- `kalsohrapi/src/routes/tenant.routes.ts` - New settings route
- `kalsohr-admin/app/[orgSlug]/recruitment/interviews/create-interview-dialog.tsx` - Timezone fix
- `kalsohr-admin/app/[orgSlug]/recruitment/applications/page.tsx` - Kanban UI updates

**Database Changes:**
- Organization table now includes `timezone` field (VARCHAR 50, default 'UTC')
- Super Admin user (ID: 1) roleId set to NULL for full access

### December 29, 2025 - Recruitment Comments System

1. **Section-Based Commenting**
   - Implemented complete commenting system for candidate evaluation
   - 13+ sections across 4 tabs (Overview, Professional, Personal, Family)
   - Each section has independent comment threads
   - Comment count badges on all section cards

2. **Comment Features**
   - Single-level threading (comments + replies)
   - Optional 1-5 star ratings for top-level comments
   - User attribution with avatars and timestamps
   - Edit/delete own comments
   - Permission-based access control

3. **Technical Implementation**
   - New database table: `CandidateComment` with self-referential foreign key
   - 4 API endpoints: GET, POST, PUT, DELETE
   - 6 new React components for UI
   - Real-time comment counts with badge display
   - Scrollable dialog with fixed comment form

4. **Critical Bug Fix**
   - Fixed `sendSuccess()` parameter order in all comment endpoints
   - Parameters were swapped (message, data) instead of (data, message)
   - Caused API to return message string as data
   - Frontend couldn't parse comments array
   - Fixed in 4 locations in `comment.controller.ts`

### December 24, 2025 - UI/UX Enhancements

1. **Stats Display Redesign**
   - Converted card-based stats to inline stats bar
   - Stats on left, search/filters on right
   - Matches subscription plans page design
   - Applied to both users and employees pages
   - Light grey background box container

2. **Dialog Header Cleanup**
   - Changed from blue gradient to light grey background
   - More professional and less distracting
   - Applied to both create employee dialogs

3. **Form Flow Simplification**
   - Removed "Ready to Create Employee" confirmation screen
   - Submit button now only appears on step 4
   - Reduced friction in employee creation process

4. **Avatar Consistency**
   - Reverted all employee avatars to blue gradient backgrounds
   - Audit info icon kept as grey (functional indicator)
   - Consistent visual identity across the app

### Functional Improvements

1. **Subscription Limit Enforcement**
   - Backend validation for maxUsers and maxEmployees
   - Prevents user creation when limit reached
   - Prevents employee creation when limit reached
   - Prevents reactivation when limit reached
   - Clear error messages with plan upgrade suggestion

2. **User Limit UI Feedback**
   - Disabled "Add User" button when limit reached
   - Tooltip shows current usage, limit, and plan name
   - Suggests plan upgrade for more users
   - Includes subscriptionInfo in API response

3. **Search Performance**
   - Added 500ms debounce to employee search
   - Separate searchInput and searchQuery states
   - Resets to page 1 when searching
   - Clear filters button also clears search

4. **Permission-Based Audit Icon**
   - Audit hover icon only shows for users with approve permission
   - Works in both superadmin and org contexts
   - Uses appropriate permission hook based on route

### Bug Fixes

1. **MySQL Compatibility**
   - Removed PostgreSQL-only `mode: 'insensitive'` from search queries
   - MySQL uses case-insensitive search by default via collation
   - Fixed 500 error when searching employees

2. **Icon Display Issues**
   - Separated CSS theme rules for background and text colors
   - Fixed icons showing as solid squares
   - Fixed light backgrounds (bg-purple-100, bg-pink-100) using 10% opacity

3. **React Warnings**
   - Added React.Fragment with key prop to pagination
   - Fixed "Each child in a list should have a unique key" warning
   - Added React import to employees page

---

### 📋 REMAINING WORK (2%)

#### 0. Comment Notification & Visibility Enhancements - RECOMMENDED PRIORITY ⭐
**Current Limitation:**
- Comments work well but lack visibility for new/unread comments
- Interviewers may miss important feedback from admins/managers
- No way to know which candidates have new comments requiring attention
- All comments look the same (no visual distinction by author role)

**Recommended Enhancements (2-3 hours):**

**Must-Have Features:**
1. **Unread Comment Tracking**
   - Add `CommentView` table to track when users last viewed each section
   - Fields: `userId`, `candidateId`, `sectionKey`, `lastViewedAt`
   - Mark section as viewed when user opens comment dialog
   - Calculate unread count: comments posted after `lastViewedAt`

2. **Visual Badge Distinction**
   - **Red pulsing badge** = Has unread comments (count shown)
   - **Blue static badge** = All comments read (count shown)
   - Different styling for admin vs peer comments
   - Badge updates in real-time after viewing

3. **Dashboard "Comments Needing Attention" Widget**
   - Show recent comments from admins on candidates user has access to
   - Display: Candidate name, section, comment preview, commenter role, time ago
   - Click to jump directly to candidate's comment dialog
   - Filter: "Unread only" or "From admins only"
   - Max 10 most recent items with "View All" link

**Nice-to-Have Features (if time permits):**
4. **Notification Bell in Header**
   - Bell icon with unread count badge
   - Dropdown showing recent comment activity
   - "Mark all as read" option
   - Direct links to view comments

5. **Enhanced Section Visual Indicators**
   - Bold section title if unread admin comments
   - Different icon for admin vs peer comments
   - Pulsing animation for urgent comments (< 1 hour old)

6. **Email Notifications** (Optional)
   - Send email when admin posts comment on candidate
   - Configurable per user in settings
   - Daily digest option

**Implementation Files:**
- Backend: `CommentView` model, update comment controller
- Frontend: Update badge component, add dashboard widget, notification service
- Database: New table + migration

**Business Value:**
- Improves collaboration between interviewers and managers
- Ensures important feedback doesn't get missed
- Reduces communication delays in recruitment workflow
- Better accountability for comment responses

#### 1. Attendance Management Module - 0% Complete
**Missing:**
- Attendance list page with calendar view
- Mark attendance dialog (check-in/check-out)
- Attendance controller and API endpoints
- Attendance reports (daily, monthly)
- Late arrival and early departure tracking
- Overtime calculation

#### 2. Leave Management Module - 0% Complete
**Missing:**
- Leave list page
- Apply leave dialog
- Approve/reject leave workflow
- Leave types configuration
- Leave balance tracking
- Leave calendar view
- Leave controller and API endpoints
- Leave reports

#### 3. Employee Self-Service Portal - 0% Complete
**Missing:**
- Employee dashboard (`/my/dashboard`)
- View own attendance (`/my/attendance`)
- Apply for leave (`/my/leave`)
- Edit profile (`/my/profile`)
- View documents (`/my/documents`)

#### 4. Organization Settings - 60% Complete ✨
**Implemented:**
- ✅ Settings hub page with navigation cards (`/[orgSlug]/settings`)
- ✅ Organization timezone settings (`/[orgSlug]/settings/organization`)
  - Timezone selector with 22+ major timezones
  - Real-time preview of current time
  - IANA timezone validation
  - Database field: `organizations.timezone`
- ✅ Organization profile view page (`/[orgSlug]/settings/profile`)
  - View organization details
  - Subscription information
  - Usage statistics

**Missing:**
- Organization profile edit functionality
- Logo upload/change
- Theme color customization UI (theme fields exist in DB)
- Module enablement UI
- Advanced settings (notifications, preferences)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Technology Stack

**Backend:**
- **Framework:** Express.js with TypeScript
- **ORM:** Prisma (with MySQL database)
- **Database:** MySQL 8+ (uses default case-insensitive collation)
- **Authentication:** JWT tokens
- **Validation:** Express middleware + Prisma validation
- **File Upload:** Multer with disk storage
- **Date Handling:** ISO-8601 DateTime conversion
- **Server:** ts-node-dev for hot reload

**Frontend:**
- **Framework:** Next.js 16.0.7 (App Router) with Turbopack
- **UI Library:** React 19
- **Styling:** Tailwind CSS with custom theme support
- **Components:** shadcn/ui (Radix UI primitives)
- **Forms:** Native React state management with debouncing
- **State Management:** Zustand (auth store with persistence)
- **Icons:** lucide-react
- **Toasts:** sonner
- **File Uploads:** FormData with multipart/form-data

**Database:**
- **Type:** MySQL
- **Host:** localhost
- **Database:** kalsohr_db
- **User:** sowmi
- **Password:** Jobs@1487
- **Tables:** 30+ tables

### Project Structure

```
kalsohr/
├── kalsohrapi/                    # Backend API
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (MySQL provider)
│   │   └── seed.ts                # Seed data
│   ├── uploads/                   # File uploads directory
│   │   ├── profiles/              # Employee profile pictures
│   │   └── organizations/         # Organization logos
│   └── src/
│       ├── controllers/           # API controllers
│       │   ├── employee.controller.ts
│       │   ├── organization.controller.ts
│       │   ├── role.controller.ts
│       │   └── user.controller.ts
│       ├── middleware/            # Auth, permissions, upload
│       ├── routes/                # Route definitions
│       └── utils/                 # Helpers

├── kalsohr-admin/                 # Frontend Application
│   ├── app/
│   │   ├── superadmin/           # Super admin pages
│   │   ├── [orgSlug]/            # Organization portal
│   │   │   ├── employees/        # Employee management
│   │   │   ├── users/            # User management
│   │   │   └── settings/         # Org settings
│   │   └── globals.css           # Global styles with theme support
│   ├── components/
│   │   ├── layout/               # Layouts, sidebars
│   │   ├── theme/                # Theme provider
│   │   └── ui/                   # shadcn components
│   └── lib/
│       ├── api/                  # API client functions
│       ├── hooks/                # Custom hooks
│       ├── stores/               # Zustand stores
│       └── types/                # TypeScript types

└── docs/                         # Documentation
    ├── PROJECT-HANDOVER.md       # This file
    ├── DATABASE-SCHEMA.md        # Database documentation
    └── PERMISSION-IMPLEMENTATION-GUIDE.md
```

---

## 🗄️ KEY DATABASE TABLES

### Core Tables
- `users` - Platform and org users
- `roles` - Platform and org roles with permissions
- `organizations` - Tenant organizations with theme colors
- `subscription_plans` - Plans with limits (maxUsers, maxEmployees, maxStorage)
- `employees` - Employee master data
- `employee_siblings` - Sibling information

### Master Data
- `countries`, `states`, `cities` - Location hierarchy
- `genders`, `blood_groups`, `religions`, `marital_statuses`
- `education_levels`, `document_types`
- `departments`, `designations`, `branches`, `employment_types`

### Subscription & Modules
- `subscription_plan_modules` - Module assignments
- `organization_modules` - Module enablement per org
- `platform_modules` - Super admin modules (9)
- `org_modules` - Organization modules (11)

---

## 🔌 CRITICAL API ENDPOINTS

### Organization Routes (`/api/v1/:orgSlug`)

#### Employees (Fully Implemented)
- `GET /api/v1/:orgSlug/employees` - List with search/filter
  - Query params: `search`, `departmentId`, `designationId`, `status`, `page`, `limit`
  - Returns: employees array + pagination + stats
- `GET /api/v1/:orgSlug/employees/:id` - Get by ID with relations
- `POST /api/v1/:orgSlug/employees` - Create with file upload
  - Validates maxEmployees limit
- `PUT /api/v1/:orgSlug/employees/:id` - Update with file upload
  - Validates maxEmployees when reactivating
- `DELETE /api/v1/:orgSlug/employees/:id` - Soft delete

#### Users (Fully Implemented)
- `GET /api/v1/:orgSlug/users` - List users
  - Returns: users array + pagination + subscriptionInfo
- `POST /api/v1/:orgSlug/users` - Create user
  - Validates maxUsers limit
- `PUT /api/v1/:orgSlug/users/:id` - Update user
  - Validates maxUsers when reactivating
- `DELETE /api/v1/:orgSlug/users/:id` - Soft delete

#### Roles & Permissions
- `GET /api/v1/:orgSlug/roles` - List org roles
- `GET /api/v1/:orgSlug/permissions/:roleId` - Get permissions
- `PUT /api/v1/:orgSlug/permissions/:roleId` - Update permissions

#### Organization Settings (New - December 31, 2025)
- `GET /api/v1/:orgSlug/organization/profile` - Get organization profile with statistics
- `PUT /api/v1/:orgSlug/organization/profile` - Update organization profile (supports logo upload)
- `PUT /api/v1/:orgSlug/organization/settings` - Update organization settings (timezone, etc.)
  - Validates IANA timezone format using `Intl.DateTimeFormat`
  - Requires 'settings' module with 'canUpdate' permission

---

## 🎨 UI/UX GUIDELINES

### Design System

**Colors:**
- Primary: Blue (`#3B82F6`)
- Headers: Light grey (`bg-gray-50`)
- Borders: Grey-200 (`border-gray-200`)
- Avatars: Blue gradient (`from-blue-600 to-blue-700`)

**Stats Bar Pattern:**
```tsx
<div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
  {/* Left side - Stats */}
  <div className="flex items-center gap-6 flex-wrap">
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Label:</span>
        <span className="text-lg font-semibold text-gray-900">{value}</span>
      </div>
    </div>
    <div className="h-4 w-px bg-gray-300" />
    {/* More stats */}
  </div>

  {/* Right side - Search and Filters */}
  <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
    {/* Search input and filter dropdowns */}
  </div>
</div>
```

**Debounced Search Pattern:**
```tsx
const [searchInput, setSearchInput] = useState('');
const [searchQuery, setSearchQuery] = useState('');

// Debounce search input
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchQuery(searchInput);
    setFilters(prev => ({ ...prev, page: 1 }));
  }, 500);
  return () => clearTimeout(timer);
}, [searchInput]);

// Input uses searchInput
<Input
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
/>
```

**Subscription Limit Tooltip:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span>
        <Button disabled={!subscriptionInfo?.canAddMore}>
          Add User
        </Button>
      </span>
    </TooltipTrigger>
    {!subscriptionInfo?.canAddMore && (
      <TooltipContent>
        <p>User limit reached ({current}/{max})</p>
        <p>Upgrade your plan to add more users.</p>
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

---

## 🔧 DEVELOPMENT COMMANDS

### Backend (kalsohrapi)
```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev  # http://localhost:3000
```

### Frontend (kalsohr-admin)
```bash
npm install
npm run dev  # http://localhost:3001
```

### Database
```bash
mysql -u sowmi -pJobs@1487 kalsohr_db
```

---

## 👥 LOGIN CREDENTIALS

### Super Admin
- **URL:** http://localhost:3001/superadmin/login
- **Email:** superadmin@kalsohr.com
- **Password:** Admin@123

### Organization Admin (Demo Company)
- **URL:** http://localhost:3001/login
- **Organization:** demo-company
- **Email:** admin@democompany.com
- **Password:** Admin@123
- **Subscription:** Premium Plan (10 users, 50 employees)

---

## 🚀 NEXT STEPS FOR CONTINUATION

### Priority 0: Comment Notification & Visibility (2-3 hours) ⭐ RECOMMENDED

**Why This First:**
The commenting system is functional but lacks discoverability. Interviewers need to know when managers post comments requiring their attention. This enhancement turns a passive commenting system into an active collaboration tool.

**Backend Tasks:**
1. Create `CommentView` model in Prisma schema
   ```prisma
   model CommentView {
     id            Int      @id @default(autoincrement())
     userId        Int
     candidateId   Int
     sectionKey    String   @db.VarChar(100)
     lastViewedAt  DateTime @default(now())

     user          User      @relation(fields: [userId], references: [id])
     candidate     Candidate @relation(fields: [candidateId], references: [id])

     @@unique([userId, candidateId, sectionKey])
     @@index([userId, candidateId])
     @@map("comment_views")
   }
   ```

2. Update `getCandidateComments` API to include unread count
   - Check CommentView for user's last viewed time
   - Count comments created after last viewed
   - Return `{ comments, stats, unreadCounts: { sectionKey: count } }`

3. Add `POST /api/v1/:orgSlug/recruitment/candidates/:id/comments/mark-viewed`
   - Accepts `sectionKey` in body
   - Upserts CommentView record with current timestamp
   - Returns success

4. Add `GET /api/v1/:orgSlug/recruitment/dashboard/recent-comments`
   - Get comments from last 7 days on candidates user can access
   - Include unread status, commenter role, candidate info
   - Paginate with limit=10

**Frontend Tasks:**
1. Update `section-comments-icon.tsx`
   - Accept `unreadCount` prop
   - Show red pulsing badge if unread > 0
   - Show blue static badge if unread === 0
   - Add CSS for pulse animation

2. Update `section-comments-dialog.tsx`
   - Call mark-viewed API when dialog opens
   - Refresh parent component's unread counts after marking viewed

3. Create dashboard widget component
   - `components/dashboard/recent-comments-widget.tsx`
   - Card with list of recent admin comments
   - Click to navigate to candidate + open specific section dialog
   - "View All" link to full comments page (optional)

4. Add to organization dashboard
   - Place widget in dashboard grid
   - Show only if user has recruitment module access

**Testing Checklist:**
- ✅ Badge shows correct unread count
- ✅ Badge turns blue after viewing comments
- ✅ Dashboard widget shows recent admin comments
- ✅ Clicking widget item opens correct candidate section
- ✅ Multiple users can have independent unread states
- ✅ Unread count updates in real-time across tabs

### Priority 1: Attendance Module (6-8 hours)

**Backend:**
1. Create `attendance.controller.ts`
2. Implement mark attendance (check-in/check-out)
3. Implement attendance listing with filters
4. Add attendance reports

**Frontend:**
1. Create `/[orgSlug]/attendance/page.tsx`
2. Implement calendar view
3. Create mark attendance dialog
4. Add stats bar (Present, Absent, Late, Half-day)

### Priority 2: Leave Module (6-8 hours)

**Backend:**
1. Create `leave.controller.ts`
2. Implement leave request CRUD
3. Implement approve/reject workflow
4. Add leave balance calculation

**Frontend:**
1. Create `/[orgSlug]/leave/page.tsx`
2. Create apply leave dialog
3. Implement approval workflow UI
4. Add leave calendar view

### Priority 3: Organization Settings (4 hours)

**Backend:**
1. Implement organization profile update endpoint
2. Add theme color update functionality

**Frontend:**
1. Create organization profile edit page
2. Implement theme color picker
3. Add logo upload functionality

---

## 📚 KEY FILES REFERENCE

### Recent Implementations (December 31, 2025)
- **Organization Settings Page:** `kalsohr-admin/app/[orgSlug]/settings/organization/page.tsx`
  - Timezone selector with 22+ options
  - Real-time preview using Intl.DateTimeFormat
  - Permission-based access control
- **Settings Hub:** `kalsohr-admin/app/[orgSlug]/settings/page.tsx`
  - Navigation cards to different settings sections
  - Clean, modern UI with icons
- **Settings API Controller:** `kalsohrapi/src/controllers/organization.controller.ts` (lines 1613-1701)
  - `updateOrganizationSettings` function with timezone validation
- **Settings Route:** `kalsohrapi/src/routes/tenant.routes.ts` (lines 346-351)
  - PUT /api/v1/:orgSlug/organization/settings
- **Organization Types:** `kalsohr-admin/lib/types/organization.ts`
  - Added `timezone` to Organization interface (line 72)
  - Added `UpdateOrganizationSettingsData` interface (lines 297-299)
- **Interview Fix:** `kalsohr-admin/app/[orgSlug]/recruitment/interviews/create-interview-dialog.tsx` (lines 119-121)
  - Converts datetime-local to ISO string before API call
- **Database Schema:** `kalsohrapi/prisma/schema.prisma` (line 81)
  - Added timezone field to Organization model
- **Kanban Updates:** `kalsohr-admin/app/[orgSlug]/recruitment/applications/page.tsx`
  - Changed "Interview Scheduled" to "Interviews" (line 541)
  - Changed Applied column color to slate (line 539)

### Recent Implementations (December 29, 2025)
- **Comment Backend:** `kalsohrapi/src/controllers/comment.controller.ts` (Full CRUD with bug fix)
- **Comment Routes:** `kalsohrapi/src/routes/tenant.routes.ts` (lines for comment endpoints)
- **Comment Model:** `kalsohrapi/prisma/schema.prisma` (CandidateComment model)
- **Comment Types:** `kalsohr-admin/lib/types/recruitment.ts` (SECTION_KEYS + interfaces)
- **Comment API Client:** `kalsohr-admin/lib/api/org/recruitment.ts` (lines 678-745)
- **Comment Components:** `kalsohr-admin/app/[orgSlug]/recruitment/candidates/[id]/components/`
  - `star-rating.tsx` - Rating input component
  - `comment-form.tsx` - Comment creation form
  - `comment-item.tsx` - Individual comment display
  - `comment-thread.tsx` - Comment list with replies
  - `section-comments-dialog.tsx` - Modal container
  - `section-comments-icon.tsx` - Badge trigger button
- **Page Integration:** `kalsohr-admin/app/[orgSlug]/recruitment/candidates/[id]/page.tsx` (Comment icons on all sections)

### Previous Implementations
- **Stats Bar:** `app/[orgSlug]/users/page.tsx` (lines 222-310)
- **Debounced Search:** `app/[orgSlug]/employees/page.tsx` (lines 90-129)
- **Limit Validation:** `kalsohrapi/src/controllers/user.controller.ts` (lines 330-346)
- **Theme Provider:** `components/theme/org-theme-provider.tsx`
- **Audit Icon:** `components/ui/audit-hover-card.tsx`

### Pattern References
- **Comment System:** Complete section-based commenting with CRUD operations
- **Employee Module:** Best example of complete CRUD implementation
- **User Module:** Example of subscription limit enforcement
- **Subscription Plans:** Example of inline stats bar design

---

## ✅ TESTING CHECKLIST

### Completed
- ✅ Employee CRUD operations
- ✅ User CRUD operations
- ✅ Subscription limit validation
- ✅ Search with debouncing
- ✅ Permission-based UI elements
- ✅ Form validations
- ✅ File uploads
- ✅ Theme customization
- ✅ Audit tracking
- ✅ **Comment system CRUD** (Create, read, update, delete)
- ✅ **Comment threading** (Single-level replies)
- ✅ **Star ratings** (1-5 stars on top-level comments)
- ✅ **Comment badges** (Count display on all sections)
- ✅ **Comment permissions** (Edit/delete own comments only)
- ✅ **Organization timezone settings** (December 31, 2025)
- ✅ **Interview date timezone fix** (December 31, 2025)
- ✅ **Super Admin permissions** (December 31, 2025)
- ✅ **Recruitment Kanban UI** (Drag-and-drop with improved design)

### Remaining
- ❌ Comment unread tracking (Priority 0)
- ❌ Comment notification system (Priority 0)
- ❌ Dashboard comment widget (Priority 0)
- ❌ Attendance module testing
- ❌ Leave module testing
- ❌ Mobile responsiveness verification
- ❌ Performance optimization
- ❌ End-to-end testing

---

## 🤝 IMPORTANT NOTES FOR NEXT AGENT

### Timezone & Date Handling (December 31, 2025)

**Timezone Implementation:**
- Organizations can now set their timezone in Settings → Organization Settings
- Timezone stored in `organizations.timezone` field (IANA format like "Asia/Kolkata")
- Backend validates timezone using `Intl.DateTimeFormat` before saving
- Default timezone: "UTC" for new organizations

**Date Input Best Practice:**
- ⚠️ **CRITICAL:** Always convert `datetime-local` input to ISO string before sending to API
- **Correct Pattern:**
  ```typescript
  // Convert datetime-local to ISO string with timezone
  const localDateTime = new Date(formData.interviewDate);
  const isoDateTime = localDateTime.toISOString();
  // Then send isoDateTime to API
  ```
- **Why:** datetime-local returns "YYYY-MM-DDTHH:mm" without timezone info
- **Issue:** If sent directly, server interprets in server timezone, causing date shifts
- **Example:** User in IST selects Dec 31 → Server in UTC saves as Jan 1

**Super Admin Permissions:**
- Main Super Admin user (`superadmin@kalsohr.com`) MUST have `roleId: NULL`
- Super Admins with no role get full unrestricted access to all modules
- Super Admins with a role follow that role's permissions
- **Verify:** Check permission middleware correctly allows `isSuperAdmin && !roleId`
- **Database:** Ensure Super Admin user (ID: 1) has roleId=NULL

### Comment System Implementation

**Critical Bug to Avoid:**
- ⚠️ **sendSuccess() parameter order:** Always use `sendSuccess(res, data, message, statusCode)` NOT `sendSuccess(res, message, data)`
- This bug caused comments to not display - API was returning message string as data
- Fixed in all comment endpoints on December 29, 2025
- Double-check all new controller endpoints follow correct order

**Comment System Architecture:**
- **Database:** Self-referential foreign key for single-level threading
- **Section Keys:** 13+ predefined keys in `SECTION_KEYS` constant - don't create new ones
- **Threading:** Enforce single-level only - check `parentComment.parentCommentId` is null
- **Ratings:** Only allowed on top-level comments, not replies
- **Permissions:** Use existing recruitment permissions (canRead, canWrite, canDelete)
- **Ownership:** Users can only edit/delete their own comments

**For Comment Enhancements (Priority 0):**
- Create `CommentView` model for unread tracking
- Use unique constraint on (userId, candidateId, sectionKey)
- Update getCandidateComments to return unread counts per section
- Add mark-viewed endpoint to upsert view timestamp
- Implement pulsing red badge for unread, static blue for read
- Dashboard widget should show admin comments from last 7 days

### Database Considerations
- **MySQL Specific:** Don't use `mode: 'insensitive'` in Prisma queries (PostgreSQL only)
- **Date Handling:** Always convert to ISO-8601 DateTime format
- **Soft Deletes:** Use `isActive` flag, not hard deletes

### UI Patterns to Follow
- **Stats Display:** Use inline bar with stats on left, search on right
- **Dialog Headers:** Light grey background (`bg-gray-50`), not gradients
- **Search Inputs:** Always debounce (500ms) to reduce API calls
- **Avatars:** Blue gradient for profiles, grey for functional icons
- **Subscription Limits:** Show disabled button with tooltip, not error after submit

### Permission System
- **Audit Icons:** Only show for users with `canApprove` permission
- **Module Access:** Check both module access AND specific permissions
- **Dependencies:** Master data read is auto-required for many modules

### Code Quality
- **React Keys:** Use `React.Fragment` with key prop in maps
- **State Management:** Separate input state from debounced query state
- **Error Handling:** Always show user-friendly toast messages
- **Validation:** Implement both frontend and backend validation

---

**End of Handover Document**

Last Updated: December 31, 2025
Version: 2.3 (Organization Settings + Timezone Support + Critical Fixes)
Status: Ready for next development phase - **Priority 0: Comment Notifications (2-3 hours)**

**What's New in v2.3 (December 31, 2025):**
- ✅ Organization timezone settings with 22+ timezones
- ✅ Settings hub page with navigation to different settings sections
- ✅ **CRITICAL FIX:** Interview date timezone issue resolved
- ✅ **CRITICAL FIX:** Super Admin permissions (roleId set to NULL)
- ✅ Recruitment Kanban board UI improvements
- ✅ Enhanced organization settings API endpoints
- ✅ IANA timezone validation on backend
- 📝 Updated documentation with timezone best practices

**What's New in v2.2 (December 29, 2025):**
- ✅ Complete section-based commenting system for candidate evaluation
- ✅ 13+ sections with independent comment threads
- ✅ Star ratings, replies, user attribution, timestamps
- ✅ Full CRUD operations with permission controls
- ✅ Fixed critical sendSuccess() parameter order bug

**Recommended Next Tasks:**

1. **Priority 0: Comment Notifications (2-3 hours)** ⭐
   - Implement unread comment tracking with CommentView model
   - Add visual distinction (red pulsing badge for unread, blue for read)
   - Create dashboard widget showing recent admin comments
   - Transform commenting from passive to active collaboration

2. **Priority 1: Complete Organization Settings (2-3 hours)**
   - Add organization profile edit functionality
   - Implement logo upload/change
   - Create theme color customization UI (DB fields already exist)
   - Add module enablement UI for admins

3. **Priority 2: Attendance Module (6-8 hours)**
   - Implement attendance marking (check-in/check-out)
   - Create calendar view for attendance tracking
   - Add attendance reports and analytics

4. **Priority 3: Leave Management Module (6-8 hours)**
   - Implement leave request workflow
   - Create leave approval system
   - Add leave balance tracking
   - Build leave calendar view

**Current System Health:**
- ✅ Super Admin access fully restored
- ✅ Interview scheduling working correctly with timezone support
- ✅ Organization settings functional with timezone configuration
- ✅ All critical bugs fixed and documented
- 🚀 Ready for next development sprint
