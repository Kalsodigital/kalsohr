// Organization Types

// Master Data Types (for relations)
export interface Country {
  id: number;
  name: string;
  code: string;
  iso2: string;
  phoneCode: string;
}

export interface State {
  id: number;
  countryId: number;
  name: string;
  code: string;
  type: string;
  country?: Country;
}

export interface City {
  id: number;
  stateId: number;
  name: string;
  code: string;
  type: string;
  state?: State;
}

// Organization Classification Types
export interface OrganizationType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface IndustryType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface BusinessCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  code: string;
  logo: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  postalCode: string | null;
  organizationTypeId: number | null;
  industryTypeId: number | null;
  businessCategoryId: number | null;
  subscriptionPlanId: number;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string | null;
  subscriptionTenure: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  maxUsers: number | null;
  maxEmployees: number | null;
  maxStorageMb: number | null;
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  themeAccentColor: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  creator?: AuditUser | null;
  updater?: AuditUser | null;
  subscriptionPlan?: SubscriptionPlan;
  country?: Country;
  state?: State;
  city?: City;
  organizationType?: OrganizationType;
  industryType?: IndustryType;
  businessCategory?: BusinessCategory;
  organizationModules?: OrganizationModule[];
  _count?: {
    users: number;
    employees: number;
    roles?: number;
  };
}

// User info for audit fields
export interface AuditUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  currency?: string;
  maxUsers?: number | null;
  maxEmployees?: number | null;
  maxStorageMb?: number | null;
  features?: string[] | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  creator?: AuditUser | null;
  updater?: AuditUser | null;
  planModules?: PlanModule[];
  _count?: {
    organizations: number;
    planModules?: number;
  };
}

export interface CreateSubscriptionPlanData {
  name: string;
  code: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  maxUsers?: number;
  maxEmployees?: number;
  maxStorageMb?: number;
  features?: string[];
  displayOrder?: number;
  moduleIds?: number[];
}

export interface UpdateSubscriptionPlanData {
  name?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  maxUsers?: number;
  maxEmployees?: number;
  maxStorageMb?: number;
  features?: string[];
  displayOrder?: number;
  isActive?: boolean;
  moduleIds?: number[];
}

export interface Module {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isCore: boolean;
  isActive: boolean;
  sortOrder: number;
}

// New module types for refactored architecture
export interface OrgModule {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  isCore: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanModule {
  id: number;
  subscriptionPlanId: number;
  orgModuleId: number;
  createdAt: string;
  orgModule?: OrgModule;
}

export interface OrganizationModule {
  id: number;
  organizationId: number;
  orgModuleId: number;
  isEnabled: boolean;
  enabledAt: string;
  disabledAt: string | null;
  orgModule?: OrgModule;
  // Legacy field for backward compatibility
  moduleCode?: string;
  module?: Module;
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  countryId: number;
  stateId: number;
  cityId: number;
  postalCode?: string;
  organizationTypeId?: number;
  industryTypeId?: number;
  businessCategoryId?: number;
  subscriptionPlanId: number;
  subscriptionExpiryDate?: string;
  // Note: Modules are now automatically assigned from the subscription plan
}

export interface UpdateOrganizationData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  postalCode?: string;
  logo?: string;
  organizationTypeId?: number;
  industryTypeId?: number;
  businessCategoryId?: number;
  subscriptionPlanId?: number;
  subscriptionExpiryDate?: string;
  isActive?: boolean;
  status?: string;
  // Note: Modules are now managed separately via updateOrganizationModules
}

export interface OrganizationsResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Organization Profile Types (for tenant profile page)
export interface OrganizationStatistics {
  totalUsers: number;
  totalEmployees: number;
  storageUsedMb: number;
  enabledModulesCount: number;
}

export interface OrganizationProfileData {
  organization: Organization;
  statistics: OrganizationStatistics;
}

export interface UpdateOrganizationProfileData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  cityId?: number;
  postalCode?: string;
  organizationTypeId?: number;
  industryTypeId?: number;
  businessCategoryId?: number;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  themeAccentColor?: string;
}
