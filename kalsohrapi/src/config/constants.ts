// API Response Messages
export const MESSAGES = {
  // Auth
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account is locked. Please contact administrator',
    ACCOUNT_INACTIVE: 'Account is inactive',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',
    UNAUTHORIZED: 'Unauthorized access',
    EMAIL_NOT_VERIFIED: 'Email not verified',
  },

  // Organization
  ORG: {
    NOT_FOUND: 'Organization not found',
    INACTIVE: 'Organization is inactive',
    SUSPENDED: 'Organization subscription is suspended',
    EXPIRED: 'Organization subscription has expired',
    CREATED: 'Organization created successfully',
    UPDATED: 'Organization updated successfully',
  },

  // User
  USER: {
    NOT_FOUND: 'User not found',
    EMAIL_EXISTS: 'Email already exists',
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
  },

  // Permission
  PERMISSION: {
    DENIED: 'You do not have permission to perform this action',
    MODULE_DISABLED: 'This module is not enabled for your organization',
  },

  // General
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    ERROR: 'An error occurred',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
  },
};

// HTTP Status Codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Token Expiry
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE_MB || '5') * 1024 * 1024, // MB to bytes
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// Module Codes
export const MODULES = {
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave',
  MASTER_DATA: 'master_data',
  REPORTS: 'reports',
  RECRUITMENT: 'recruitment',
  PAYROLL: 'payroll',
};

// Permission Actions
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
};

// Default System Roles
export const SYSTEM_ROLES = {
  ORG_ADMIN: 'org_admin',
  HR_MANAGER: 'hr_manager',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Employee Status
export const EMPLOYEE_STATUS = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
  RESIGNED: 'Resigned',
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
};

// Leave Request Status
export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

// Organization Status
export const ORG_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
};

// Subscription Plan Codes
export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
};
