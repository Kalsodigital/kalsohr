// Authentication Types

export interface Permission {
  moduleCode: string;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

// User info for audit fields
export interface AuditUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  creator?: AuditUser | null;
  updater?: AuditUser | null;
  role: Role | null;
  organization: Organization | null;
  permissions?: Permission[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
  status: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  orgSlug?: string; // Optional: for organization-scoped login
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ImpersonatedOrganization {
  id: number;
  name: string;
  slug: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean; // Track if Zustand has loaded from localStorage
  impersonatedOrg: ImpersonatedOrganization | null; // Organization being impersonated by super admin
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUserData: () => Promise<void>;
  startImpersonation: (org: { id: number; name: string; slug: string }) => void;
  stopImpersonation: () => void;
}
