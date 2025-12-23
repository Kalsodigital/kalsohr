// Organization-scoped Types
// Types for organization portal pages

import { Permission } from './auth';

// Extended Role type for org management
export interface OrgRole {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    permissions: number;
  };
}

// Role Permission for display/edit
export interface RolePermission {
  id: number;
  roleId: number;
  moduleCode: string;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

// API Response Types
export interface OrgRolesResponse {
  success: boolean;
  data: {
    roles: OrgRole[];
  };
}

export interface OrgRoleResponse {
  success: boolean;
  data: OrgRole;
}

export interface RolePermissionsResponse {
  success: boolean;
  data: {
    permissions: RolePermission[];
  };
}

// Request Types
export interface CreateOrgRoleData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateOrgRoleData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRolePermissionsData {
  permissions: {
    moduleCode: string;
    canRead: boolean;
    canWrite: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
  }[];
}

// Org User Types (organization-scoped)
export interface OrgUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roleId: number | null;
  role: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export interface OrgUsersResponse {
  success: boolean;
  data: {
    users: OrgUser[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface OrgUserResponse {
  success: boolean;
  data: OrgUser;
}

export interface CreateOrgUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: number;
  isActive?: boolean;
}

export interface UpdateOrgUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: number;
  isActive?: boolean;
  password?: string;
}

export interface OrgUserFilters {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: number;
  isActive?: boolean;
}

// Org Modules
export interface OrgModule {
  id: number;
  moduleCode: string;
  isEnabled: boolean;
  module: {
    code: string;
    name: string;
    description: string;
  };
}

export interface OrgModulesResponse {
  success: boolean;
  data: {
    modules: OrgModule[];
  };
}
