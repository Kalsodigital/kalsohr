# KalsoHR Database Schema

## Database: kalsohr_db

**MySQL Version:** 8.0+
**ORM:** Prisma
**Character Set:** utf8mb4
**Collation:** utf8mb4_unicode_ci

## Multi-Tenant Strategy

All tenant-specific tables include `organization_id` column with:
- Foreign key to `organizations(id)`
- Composite index on `(organization_id, id)`
- ON DELETE CASCADE for data cleanup

## Schema Overview

### Core Tables (Platform Level)

#### 1. organizations
Tenant master table

```sql
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  logo VARCHAR(255),

  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',

  -- Subscription
  subscription_plan_id INT NOT NULL,
  subscription_start_date DATE,
  subscription_expiry_date DATE,
  is_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at DATETIME,

  -- Limits
  max_users INT DEFAULT 10,
  max_employees INT DEFAULT 50,
  max_storage_mb INT DEFAULT 1000,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id),
  INDEX idx_slug (slug),
  INDEX idx_status (is_active, status)
);
```

#### 2. subscription_plans
Subscription tiers

```sql
CREATE TABLE subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'INR',

  -- Limits
  max_users INT,
  max_employees INT,
  max_storage_mb INT,

  -- Features (JSON)
  features JSON,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO subscription_plans (name, code, price_monthly, price_yearly, max_users, max_employees, max_storage_mb, features) VALUES
('Basic', 'basic', 999.00, 9990.00, 5, 25, 500, '["employees", "attendance", "leave"]'),
('Premium', 'premium', 2999.00, 29990.00, 15, 100, 2000, '["employees", "attendance", "leave", "recruitment"]'),
('Enterprise', 'enterprise', 9999.00, 99990.00, -1, -1, 10000, '["employees", "attendance", "leave", "recruitment", "payroll", "reports"]');
```

#### 3. organization_modules
Module enablement per organization

```sql
CREATE TABLE organization_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  enabled_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_module (organization_id, module_code),
  INDEX idx_org_enabled (organization_id, is_enabled)
);
```

#### 4. modules
System-defined modules

```sql
CREATE TABLE modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_core BOOLEAN DEFAULT FALSE,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO modules (name, code, is_core, icon, display_order) VALUES
('Dashboard', 'dashboard', TRUE, 'LayoutDashboard', 1),
('Employees', 'employees', TRUE, 'Users', 2),
('Attendance', 'attendance', TRUE, 'Calendar', 3),
('Leave Management', 'leave', TRUE, 'CalendarOff', 4),
('Master Data', 'master_data', TRUE, 'Database', 5),
('Reports', 'reports', TRUE, 'FileText', 6),
('Recruitment', 'recruitment', FALSE, 'Briefcase', 7),
('Payroll', 'payroll', FALSE, 'DollarSign', 8);
```

### Authentication & Authorization

#### 5. users
All system users (super admin + org users)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NULL,  -- NULL for super admin
  role_id INT NULL,

  -- Credentials
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar VARCHAR(255),

  -- Flags
  is_super_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,

  -- Security
  last_login_at DATETIME,
  password_changed_at DATETIME,
  failed_login_attempts INT DEFAULT 0,
  locked_until DATETIME,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_org_email (organization_id, email),
  INDEX idx_active (is_active)
);
```

#### 6. roles
Platform and tenant-specific roles

```sql
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NULL,  -- NULL for platform roles

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  -- System role (cannot be deleted)
  is_system BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_role (organization_id, code),
  INDEX idx_org_active (organization_id, is_active)
);
```

#### 7. role_permissions
Granular permissions per role per module

```sql
CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  module_code VARCHAR(50) NOT NULL,

  -- CRUD permissions
  can_read BOOLEAN DEFAULT FALSE,
  can_write BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,

  -- Additional permissions
  can_approve BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_module (role_id, module_code)
);
```

### Master Data Tables (Org-specific)

#### 8. departments

```sql
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  head_employee_id INT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org (organization_id),
  UNIQUE KEY unique_org_dept (organization_id, code)
);
```

#### 9. designations

```sql
CREATE TABLE designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  level INT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org (organization_id)
);
```

#### 10. employment_types

```sql
CREATE TABLE employment_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org (organization_id)
);
```

#### 11. branches

```sql
CREATE TABLE branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),

  -- Address
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',

  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),

  -- Manager
  manager_id INT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org (organization_id)
);
```

### Employee Management

#### 12. employees

```sql
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_id INT,  -- Links to users table if employee has login

  -- Employee ID
  employee_code VARCHAR(50) NOT NULL,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender ENUM('Male', 'Female', 'Other'),

  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),

  -- Address
  current_address TEXT,
  permanent_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),

  -- Employment Details
  department_id INT,
  designation_id INT,
  employment_type_id INT,
  branch_id INT,

  date_of_joining DATE,
  date_of_leaving DATE,

  -- Salary
  salary DECIMAL(10, 2),

  -- Documents
  profile_picture VARCHAR(255),
  aadhar_number VARCHAR(12),
  pan_number VARCHAR(10),

  -- Family
  father_name VARCHAR(100),
  mother_name VARCHAR(100),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),

  -- Status
  status ENUM('Active', 'On Leave', 'Terminated', 'Resigned') DEFAULT 'Active',
  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (designation_id) REFERENCES designations(id),
  FOREIGN KEY (employment_type_id) REFERENCES employment_types(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),

  UNIQUE KEY unique_org_emp_code (organization_id, employee_code),
  INDEX idx_org (organization_id),
  INDEX idx_org_status (organization_id, status, is_active)
);
```

#### 13. employee_documents

```sql
CREATE TABLE employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  employee_id INT NOT NULL,

  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),

  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_org_emp (organization_id, employee_id)
);
```

### Attendance Management

#### 14. attendance

```sql
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  employee_id INT NOT NULL,
  branch_id INT,

  attendance_date DATE NOT NULL,

  status ENUM('Present', 'Absent', 'Half Day', 'Leave', 'Holiday') NOT NULL,

  check_in_time TIME,
  check_out_time TIME,

  work_hours DECIMAL(4, 2),
  overtime_hours DECIMAL(4, 2),

  notes TEXT,
  absence_reason TEXT,

  marked_by INT,
  marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id),

  UNIQUE KEY unique_emp_date (organization_id, employee_id, attendance_date),
  INDEX idx_org_date (organization_id, attendance_date),
  INDEX idx_emp_date (employee_id, attendance_date)
);
```

### Leave Management

#### 15. leave_types

```sql
CREATE TABLE leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  days_per_year INT DEFAULT 0,
  is_paid BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT TRUE,
  max_consecutive_days INT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org (organization_id)
);
```

#### 16. leave_balances

```sql
CREATE TABLE leave_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,

  year INT NOT NULL,
  total_days DECIMAL(5, 2) DEFAULT 0,
  used_days DECIMAL(5, 2) DEFAULT 0,
  remaining_days DECIMAL(5, 2) DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),

  UNIQUE KEY unique_emp_leave_year (employee_id, leave_type_id, year),
  INDEX idx_org_emp (organization_id, employee_id)
);
```

#### 17. leave_requests

```sql
CREATE TABLE leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5, 2) NOT NULL,

  reason TEXT,
  status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',

  approved_by INT,
  approved_at DATETIME,
  rejection_reason TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),

  INDEX idx_org_emp (organization_id, employee_id),
  INDEX idx_org_status (organization_id, status),
  INDEX idx_dates (start_date, end_date)
);
```

### Recruitment Module (Optional)

#### 18. job_positions

```sql
CREATE TABLE job_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  department_id INT,

  title VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  required_skills TEXT,
  required_qualifications TEXT,
  min_experience INT DEFAULT 0,
  max_experience INT,

  vacancies INT DEFAULT 1,
  priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  status ENUM('Open', 'On Hold', 'Filled', 'Closed') DEFAULT 'Open',

  posted_date DATE,
  closing_date DATE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  INDEX idx_org_status (organization_id, status)
);
```

#### 19. candidates

```sql
CREATE TABLE candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  resume_path VARCHAR(255),
  profile_picture VARCHAR(255),

  total_experience INT,
  current_company VARCHAR(255),
  current_salary DECIMAL(10, 2),
  expected_salary DECIMAL(10, 2),
  notice_period INT,

  skills TEXT,
  qualifications TEXT,

  source VARCHAR(100),
  status ENUM('New', 'In Process', 'Selected', 'Rejected', 'On Hold') DEFAULT 'New',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org_status (organization_id, status)
);
```

#### 20. applications

```sql
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  candidate_id INT NOT NULL,
  job_position_id INT NOT NULL,

  applied_date DATE NOT NULL,
  status ENUM('Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected') DEFAULT 'Applied',

  notes TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (job_position_id) REFERENCES job_positions(id) ON DELETE CASCADE,

  UNIQUE KEY unique_candidate_position (candidate_id, job_position_id),
  INDEX idx_org_status (organization_id, status)
);
```

#### 21. interview_schedules

```sql
CREATE TABLE interview_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  application_id INT NOT NULL,

  round_name VARCHAR(100),
  interview_date DATETIME NOT NULL,
  interview_mode ENUM('In-person', 'Video', 'Phone') DEFAULT 'In-person',

  interviewer_id INT,
  location VARCHAR(255),
  meeting_link VARCHAR(500),

  status ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Scheduled',

  feedback TEXT,
  rating INT,
  result ENUM('Pass', 'Fail', 'On Hold'),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (interviewer_id) REFERENCES users(id),

  INDEX idx_org_date (organization_id, interview_date),
  INDEX idx_interviewer (interviewer_id, interview_date)
);
```

### Audit & System Tables

#### 22. audit_logs

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  user_id INT,

  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT,

  old_values JSON,
  new_values JSON,

  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),

  INDEX idx_org_entity (organization_id, entity_type, entity_id),
  INDEX idx_user_date (user_id, created_at),
  INDEX idx_created (created_at)
);
```

## Indexes Summary

For optimal query performance, these composite indexes are critical:

```sql
-- Organizations
CREATE INDEX idx_org_active ON organizations(is_active, status);

-- Users
CREATE INDEX idx_user_org_email ON users(organization_id, email);
CREATE INDEX idx_user_active ON users(is_active);

-- Employees
CREATE INDEX idx_emp_org ON employees(organization_id);
CREATE INDEX idx_emp_org_status ON employees(organization_id, status, is_active);

-- Attendance
CREATE INDEX idx_att_org_date ON attendance(organization_id, attendance_date);
CREATE INDEX idx_att_emp_date ON attendance(employee_id, attendance_date);

-- Leave Requests
CREATE INDEX idx_leave_org_status ON leave_requests(organization_id, status);
```

## Database Size Estimation

For a mid-sized organization (100 employees):
- Master data: ~1 MB
- Employee records: ~10 MB
- Attendance (1 year): ~5 MB
- Leave requests: ~2 MB
- Documents/files: ~500 MB (stored on filesystem)

**Total per org:** ~20 MB database + 500 MB files

## Migration Strategy

1. Create database: `kalsohr_db`
2. Initialize Prisma
3. Run migrations
4. Seed system data (plans, modules)
5. Create super admin user
6. Ready for first organization

---

*Schema Version: 1.0*
*Last Updated: December 4, 2025*
