// User Management Types
// This extends the base User type from auth.ts with additional management-specific types

import { User, Role, Organization } from './auth';

// Subscription Info Type
export interface SubscriptionInfo {
  planName: string;
  maxUsers: number | null;
  currentActiveUsers: number;
  canAddMore: boolean;
}

// API Response Types
export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    subscriptionInfo?: SubscriptionInfo;
  };
}

export interface UserResponse {
  success: boolean;
  data: User;
}

// Request Types
export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationId: number;
  roleId?: number;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: number;
  isActive?: boolean;
  password?: string; // Optional password update
}

// Filter & Search Types
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string; // Search in email, firstName, lastName
  organizationId?: number;
  roleId?: number;
  isActive?: boolean;
}

// Stats Type
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byOrganization: {
    [key: string]: number;
  };
}

// Re-export auth types for convenience
export type { User, Role, Organization };
