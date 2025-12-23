# KalsoHR - Seeded Data Reference

This document contains all the default data that was seeded into the database for development and testing.

**Last Seeded:** December 4, 2025

---

## 🔐 Login Credentials

### Super Admin (Platform Level)
Access to all organizations and system-wide settings.

- **Email:** `superadmin@kalsohr.com`
- **Password:** `Admin@123`
- **Access Level:** Platform Super Admin
- **Can Access:** All organizations, system settings, create new organizations

### Test Organization Admin
Admin for the demo company organization.

- **Organization Slug:** `demo-company`
- **Email:** `admin@democompany.com`
- **Password:** `Admin@123`
- **Role:** Organization Admin
- **Access Level:** Full access to demo-company organization
- **Can Access:** All modules within demo-company

---

## 💳 Subscription Plans

### 1. Basic Plan
- **Code:** `basic`
- **Price:** ₹999/month or ₹9,990/year
- **Limits:**
  - Max Users: 5
  - Max Employees: 25
  - Max Storage: 500 MB
- **Features:**
  - Employees
  - Attendance
  - Leave Management
  - Master Data
  - Reports

### 2. Premium Plan ⭐
- **Code:** `premium`
- **Price:** ₹2,999/month or ₹29,990/year
- **Limits:**
  - Max Users: 15
  - Max Employees: 100
  - Max Storage: 2 GB
- **Features:**
  - All Basic features
  - Recruitment Module

### 3. Enterprise Plan
- **Code:** `enterprise`
- **Price:** ₹9,999/month or ₹99,990/year
- **Limits:**
  - Max Users: Unlimited
  - Max Employees: Unlimited
  - Max Storage: 10 GB
- **Features:**
  - All Premium features
  - Payroll Module
  - Performance Reviews
  - Advanced Analytics

---

## 🧩 System Modules

All modules available in the system:

| Module | Code | Type | Icon | Available In |
|--------|------|------|------|--------------|
| Dashboard | `dashboard` | Core | LayoutDashboard | All Plans |
| Employees | `employees` | Core | Users | All Plans |
| Attendance | `attendance` | Core | Calendar | All Plans |
| Leave Management | `leave` | Core | CalendarOff | All Plans |
| Master Data | `master_data` | Core | Database | All Plans |
| Reports | `reports` | Core | FileText | All Plans |
| Recruitment | `recruitment` | Optional | Briefcase | Premium+ |
| Payroll | `payroll` | Optional | DollarSign | Enterprise |

**Core Modules:** Always available to all organizations
**Optional Modules:** Available based on subscription plan

---

## 🏢 Test Organization Details

### Organization Info
- **Name:** Demo Company
- **Slug:** `demo-company` (use in URLs: `/demo-company/dashboard`)
- **Code:** `DEMO001`
- **Email:** contact@democompany.com
- **Phone:** +91 9876543210
- **Location:** Mumbai, Maharashtra, India
- **Subscription:** Premium Plan
- **Subscription Valid Until:** December 4, 2026 (1 year from seeding)
- **Status:** Active

### Enabled Modules
The following modules are enabled for demo-company:
- ✅ Dashboard
- ✅ Employees
- ✅ Attendance
- ✅ Leave Management
- ✅ Master Data
- ✅ Reports
- ✅ Recruitment

---

## 🎭 Default Roles (for demo-company)

### 1. Organization Admin
- **Code:** `org_admin`
- **System Role:** Yes (cannot be deleted)
- **Description:** Full access to all modules within the organization
- **Permissions:** Full CRUD + Approve + Export on all modules

### 2. HR Manager
- **Code:** `hr_manager`
- **System Role:** Yes
- **Description:** Manage employees, attendance, leave, and recruitment
- **Permissions:**
  - Dashboard: Read
  - Employees: Full CRUD + Export
  - Attendance: Full CRUD + Export
  - Leave: Full CRUD + Approve + Export
  - Recruitment: Full CRUD + Approve + Export
  - Master Data: Full CRUD
  - Reports: Read + Export

### 3. Manager
- **Code:** `manager`
- **System Role:** Yes
- **Description:** View employees, manage attendance and approve leave requests
- **Permissions:**
  - Dashboard: Read
  - Employees: Read + Export
  - Attendance: Read, Write, Update + Export
  - Leave: Read, Write, Update + Approve + Export
  - Reports: Read + Export

### 4. Employee
- **Code:** `employee`
- **System Role:** Yes
- **Description:** Self-service access for employees
- **Permissions:**
  - Dashboard: Read
  - Attendance: Read (own attendance only)
  - Leave: Read, Write (apply for own leave)

---

## 📋 Sample Master Data (for demo-company)

### Departments

| ID | Name | Code | Status |
|----|------|------|--------|
| 1 | Human Resources | HR | Active |
| 2 | Information Technology | IT | Active |
| 3 | Sales | SALES | Active |

### Designations

| Name | Code | Level | Status |
|------|------|-------|--------|
| Manager | MGR | 3 | Active |
| Senior Executive | SR_EXEC | 2 | Active |
| Executive | EXEC | 1 | Active |
| Intern | INTERN | 0 | Active |

**Note:** Level indicates hierarchy (higher number = higher position)

### Employment Types

| Name | Code | Status |
|------|------|--------|
| Full-time | FT | Active |
| Part-time | PT | Active |
| Contract | CONTRACT | Active |
| Intern | INTERN | Active |

### Branches/Locations

#### 1. Mumbai Head Office
- **Code:** `MUM_HO`
- **Address:** 123 Business Park, Andheri East, Mumbai, Maharashtra 400069
- **Phone:** +91 22 12345678
- **Email:** mumbai@democompany.com
- **Status:** Active

#### 2. Delhi Branch
- **Code:** `DEL_BR`
- **Address:** 456 Corporate Tower, Connaught Place, New Delhi, Delhi 110001
- **Phone:** +91 11 87654321
- **Email:** delhi@democompany.com
- **Status:** Active

### Leave Types

| Name | Code | Days/Year | Paid | Max Consecutive | Status |
|------|------|-----------|------|-----------------|--------|
| Casual Leave | CL | 12 | Yes | 3 days | Active |
| Sick Leave | SL | 7 | Yes | 5 days | Active |
| Privilege Leave | PL | 21 | Yes | No limit | Active |

**Total Annual Leave:** 40 days per employee

---

## 🧪 Testing Scenarios

### Test as Super Admin
```
1. Login with: superadmin@kalsohr.com / Admin@123
2. Access: /superadmin/organizations
3. Can view all organizations
4. Can create new organizations
5. Can manage system-wide settings
```

### Test as Organization Admin
```
1. Login with: admin@democompany.com / Admin@123
2. Organization: demo-company
3. Access: /demo-company/dashboard
4. Can manage all modules within demo-company
5. Can create users and assign roles
6. Can create employees, manage attendance, etc.
```

### Create Additional Test Users
You can create additional users through the API or admin panel:

**Sample HR Manager:**
- Email: hr@democompany.com
- Role: HR Manager
- Can manage employees, attendance, leave, recruitment

**Sample Manager:**
- Email: manager@democompany.com
- Role: Manager
- Can view employees, manage attendance, approve leave

**Sample Employee:**
- Email: employee@democompany.com
- Role: Employee
- Self-service access only

---

## 🔄 Re-seeding the Database

If you need to reset the database and re-seed:

```bash
# Reset database (⚠️ This will delete ALL data)
npx prisma migrate reset

# Or manually re-seed
npm run prisma:seed
```

**Note:** This will recreate all the data listed above.

---

## 📊 Database Statistics

After seeding, the database contains:

- **Subscription Plans:** 3
- **System Modules:** 8
- **Organizations:** 1 (demo-company)
- **Users:** 2 (1 super admin, 1 org admin)
- **Roles:** 4 (for demo-company)
- **Role Permissions:** 35 permission entries
- **Organization Modules:** 7 enabled modules
- **Departments:** 3
- **Designations:** 4
- **Employment Types:** 4
- **Branches:** 2
- **Leave Types:** 3

**Total Records:** ~80+ records

---

## 🚀 Next Steps

1. **Test Login:**
   - Start the API server: `npm run dev`
   - Test login endpoint with the credentials above
   - Verify JWT token generation

2. **Create More Test Data:**
   - Add sample employees
   - Mark attendance records
   - Create leave requests
   - Add job positions and candidates

3. **Test Multi-Tenancy:**
   - Create a second organization as super admin
   - Verify data isolation between organizations
   - Test tenant switching

4. **Test Permissions:**
   - Login as different roles
   - Verify permission-based access
   - Test denied actions

---

## 🔒 Security Notes

**Important:**

1. **Change Default Passwords** in production
2. The super admin password `Admin@123` should be changed immediately
3. Generate strong JWT secrets before deployment
4. Enable email verification in production
5. Set up proper password policies (complexity, expiry, etc.)

---

## 📝 Customization

To customize the seeded data, edit:
```
/kalsohrapi/prisma/seed.ts
```

Then run:
```bash
npm run prisma:seed
```

---

*Last Updated: December 4, 2025*
*Version: 1.0*
