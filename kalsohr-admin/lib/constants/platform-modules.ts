/**
 * Platform-level modules for super admin panel
 * These modules are available for platform-level roles
 */

export interface PlatformModule {
  code: string;
  name: string;
  description: string;
  icon?: string;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    code: 'organizations',
    name: 'Organizations Management',
    description: 'Create, update, and manage tenant organizations',
  },
  {
    code: 'accounts',
    name: 'Accounts Management',
    description: 'Manage platform super admin user accounts',
  },
  {
    code: 'platform_roles',
    name: 'Platform Roles & Permissions',
    description: 'Manage platform-level roles and their permissions',
  },
  {
    code: 'subscription_plans',
    name: 'Subscription Plans',
    description: 'Manage subscription plans and pricing',
  },
  {
    code: 'system_modules',
    name: 'System Modules',
    description: 'Manage available system modules',
  },
  {
    code: 'system_settings',
    name: 'System Settings',
    description: 'Configure system-wide settings and preferences',
  },
  {
    code: 'audit_logs',
    name: 'Audit Logs',
    description: 'View and manage system audit logs',
  },
  {
    code: 'analytics',
    name: 'Platform Analytics',
    description: 'View platform-wide analytics and reports',
  },
  {
    code: 'master_data',
    name: 'Master Data',
    description: 'Manage global master data (countries, states, cities, etc.)',
  },
];

/**
 * Permission actions available for each module
 */
export interface Permission {
  key: keyof PermissionSet;
  label: string;
  description: string;
}

export interface PermissionSet {
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

export const PERMISSION_ACTIONS: Permission[] = [
  {
    key: 'canRead',
    label: 'Read',
    description: 'View and access module data',
  },
  {
    key: 'canWrite',
    label: 'Create',
    description: 'Create new records',
  },
  {
    key: 'canUpdate',
    label: 'Update',
    description: 'Edit existing records',
  },
  {
    key: 'canDelete',
    label: 'Delete',
    description: 'Delete records',
  },
  {
    key: 'canApprove',
    label: 'Approve',
    description: 'Approve or reject actions',
  },
  {
    key: 'canExport',
    label: 'Export',
    description: 'Export data to files',
  },
];

/**
 * Default permission set (all permissions disabled)
 */
export const DEFAULT_PERMISSIONS: PermissionSet = {
  canRead: false,
  canWrite: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
};

/**
 * Full access permission set (all permissions enabled)
 */
export const FULL_ACCESS_PERMISSIONS: PermissionSet = {
  canRead: true,
  canWrite: true,
  canUpdate: true,
  canDelete: true,
  canApprove: true,
  canExport: true,
};
