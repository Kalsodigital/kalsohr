/**
 * Organization-Level Module Definitions
 *
 * These are the modules available to organization users (NOT platform/super admin modules).
 * Each module can be enabled/disabled per organization based on their subscription plan.
 */

export interface OrgModule {
  code: string;
  name: string;
  description: string;
  isCore: boolean; // Core modules are always enabled
  icon?: string; // Optional icon name for UI
}

/**
 * All organization-level modules
 */
export const ORG_MODULES: OrgModule[] = [
  {
    code: 'dashboard',
    name: 'Dashboard',
    description: 'View organization dashboard with analytics and insights',
    isCore: true,
    icon: 'LayoutDashboard',
  },
  {
    code: 'employees',
    name: 'Employees',
    description: 'Manage employee records, documents, and profiles',
    isCore: true,
    icon: 'Users',
  },
  {
    code: 'attendance',
    name: 'Attendance',
    description: 'Track and manage employee attendance and work hours',
    isCore: true,
    icon: 'Calendar',
  },
  {
    code: 'leave',
    name: 'Leave Management',
    description: 'Manage leave requests, approvals, and balances',
    isCore: true,
    icon: 'CalendarOff',
  },
  {
    code: 'master_data',
    name: 'Master Data',
    description: 'Manage departments, designations, branches, and other master data',
    isCore: true,
    icon: 'Database',
  },
  {
    code: 'roles',
    name: 'Roles & Permissions',
    description: 'Manage user roles and permissions for your organization',
    isCore: true,
    icon: 'Shield',
  },
  {
    code: 'users',
    name: 'User Management',
    description: 'Manage organization users and their access',
    isCore: true,
    icon: 'UserCog',
  },
  {
    code: 'reports',
    name: 'Reports',
    description: 'Generate and view various HR reports and analytics',
    isCore: true,
    icon: 'FileText',
  },
  {
    code: 'recruitment',
    name: 'Recruitment',
    description: 'Manage job postings, candidates, and hiring pipeline',
    isCore: false,
    icon: 'Briefcase',
  },
  {
    code: 'payroll',
    name: 'Payroll',
    description: 'Process payroll, generate payslips, and manage compensation',
    isCore: false,
    icon: 'DollarSign',
  },
  {
    code: 'performance',
    name: 'Performance Management',
    description: 'Manage performance reviews, goals, and feedback',
    isCore: false,
    icon: 'Target',
  },
  {
    code: 'assets',
    name: 'Assets Management',
    description: 'Track and manage company assets assigned to employees',
    isCore: false,
    icon: 'Package',
  },
  {
    code: 'settings',
    name: 'Organization Settings',
    description: 'Manage organization settings and preferences',
    isCore: true,
    icon: 'Settings',
  },
];

/**
 * Get module by code
 */
export const getModuleByCode = (code: string): OrgModule | undefined => {
  return ORG_MODULES.find((module) => module.code === code);
};

/**
 * Get only core modules
 */
export const getCoreModules = (): OrgModule[] => {
  return ORG_MODULES.filter((module) => module.isCore);
};

/**
 * Get only optional modules
 */
export const getOptionalModules = (): OrgModule[] => {
  return ORG_MODULES.filter((module) => !module.isCore);
};

/**
 * Get modules by codes (useful for filtering enabled modules)
 */
export const getModulesByCodes = (codes: string[]): OrgModule[] => {
  return ORG_MODULES.filter((module) => codes.includes(module.code));
};
