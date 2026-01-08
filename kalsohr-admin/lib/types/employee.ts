// Employee Management Types
// Types for employee module in organization portal

/**
 * Employee Sibling
 */
export interface EmployeeSibling {
  id: number;
  employeeId: number;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  contact: string | null;
  isEmergencyContact: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main Employee Interface
 * Includes all 50+ fields and nested relations
 */
export interface Employee {
  id: number;
  organizationId: number;
  employeeCode: string;

  // Basic Information
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  profilePicture: string | null;

  // Employment Details
  departmentId: number | null;
  designationId: number | null;
  branchId: number | null;
  employmentTypeId: number | null;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  salary: number | null;
  status: string;
  isActive: boolean;

  // Personal Information
  genderId: number | null;
  // maritalStatus removed - Employee schema only has maritalStatusId
  maritalStatusId: number | null;
  bloodGroup: string | null;
  religion: string | null;
  educationLevel: string | null;
  degrees: string | null;

  // Address Information
  currentAddress: string | null;
  permanentAddress: string | null;
  cityId: number | null;
  postalCode: string | null;

  // Family Information
  fatherName: string | null;
  fatherOccupation: string | null;
  fatherContact: string | null;
  fatherStatus: string | null;
  motherName: string | null;
  motherOccupation: string | null;
  motherContact: string | null;
  motherStatus: string | null;
  familyAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;

  // Document Information
  aadharNumber: string | null;
  panNumber: string | null;
  idProof: string | null;

  // Banking Information
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  uanNumber: string | null;

  // System Fields
  userId: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;

  // Nested Relations
  department: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  } | null;
  designation: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  } | null;
  branch: {
    id: number;
    name: string;
    code: string;
    address: string | null;
  } | null;
  employmentType: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  } | null;
  genderMaster: {
    id: number;
    name: string;
    code: string;
  } | null;
  maritalStatusMaster: {
    id: number;
    name: string;
    code: string;
  } | null;
  bloodGroupMaster: {
    id: number;
    name: string;
    code: string;
  } | null;
  religionMaster: {
    id: number;
    name: string;
    code: string;
  } | null;
  educationLevelMaster: {
    id: number;
    name: string;
    code: string;
  } | null;
  cityMaster: {
    id: number;
    name: string;
    stateId: number;
    state: {
      id: number;
      name: string;
      code: string;
      countryId: number;
      country: {
        id: number;
        name: string;
        code: string;
      };
    };
  } | null;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
  creator?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  updater?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;

  // Siblings array
  siblings?: EmployeeSibling[];

  // Counts for related entities
  _count?: {
    siblings: number;
    documents: number;
    attendance: number;
    leaveRequests: number;
  };
}

/**
 * Employee List Item (for table display)
 * Lighter version with essential fields only
 */
export interface EmployeeListItem {
  id: number;
  employeeCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfJoining: string;
  status: string;
  isActive: boolean;
  department: {
    id: number;
    name: string;
    code: string;
  } | null;
  designation: {
    id: number;
    name: string;
    code: string;
  } | null;
  branch: {
    id: number;
    name: string;
    code: string;
  } | null;
}

/**
 * API Response Types
 */
export interface EmployeesResponse {
  success: boolean;
  data: {
    employees: Employee[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

export interface EmployeeResponse {
  success: boolean;
  data: {
    employee: Employee;
  };
  message: string;
}

/**
 * Create Employee Request Data
 */
export interface CreateEmployeeData {
  // Required fields
  firstName: string;
  employeeCode: string;
  dateOfJoining: string;

  // Basic Information (optional)
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  profilePicture?: string;

  // Employment Details (optional)
  departmentId?: number;
  designationId?: number;
  branchId?: number;
  employmentTypeId?: number;
  dateOfLeaving?: string;
  salary?: number;
  status?: string;
  isActive?: boolean;

  // Personal Information (optional)
  genderId?: number;
  // maritalStatus removed - use maritalStatusId instead
  maritalStatusId?: number;
  bloodGroup?: string;
  religion?: string;
  educationLevel?: string;
  degrees?: string;

  // Address Information (optional)
  currentAddress?: string;
  permanentAddress?: string;
  cityId?: number;
  postalCode?: string;

  // Family Information (optional)
  fatherName?: string;
  fatherOccupation?: string;
  fatherContact?: string;
  fatherStatus?: string;
  motherName?: string;
  motherOccupation?: string;
  motherContact?: string;
  motherStatus?: string;
  familyAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Document Information (optional)
  aadharNumber?: string;
  panNumber?: string;
  idProof?: string;

  // Banking Information (optional)
  bankAccountNumber?: string;
  bankIfscCode?: string;
  uanNumber?: string;

  // Siblings (optional)
  siblings?: {
    name: string;
    dateOfBirth?: string;
    gender?: string;
    occupation?: string;
    maritalStatus?: string;
    contact?: string;
    isEmergencyContact?: boolean;
  }[];

  // User Association (optional)
  userId?: number;
}

/**
 * Update Employee Request Data
 * All fields optional for partial updates
 */
export interface UpdateEmployeeData {
  // Basic Information
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  profilePicture?: string;

  // Employment Details
  departmentId?: number;
  designationId?: number;
  branchId?: number;
  employmentTypeId?: number;
  dateOfJoining?: string;
  dateOfLeaving?: string;
  salary?: number;
  status?: string;
  isActive?: boolean;

  // Personal Information
  genderId?: number;
  // maritalStatus removed - use maritalStatusId instead
  maritalStatusId?: number;
  bloodGroup?: string;
  religion?: string;
  educationLevel?: string;
  degrees?: string;

  // Address Information
  currentAddress?: string;
  permanentAddress?: string;
  cityId?: number;
  postalCode?: string;

  // Family Information
  fatherName?: string;
  fatherOccupation?: string;
  fatherContact?: string;
  fatherStatus?: string;
  motherName?: string;
  motherOccupation?: string;
  motherContact?: string;
  motherStatus?: string;
  familyAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Document Information
  aadharNumber?: string;
  panNumber?: string;
  idProof?: string;

  // Banking Information
  bankAccountNumber?: string;
  bankIfscCode?: string;
  uanNumber?: string;

  // Siblings (optional - for updating siblings)
  siblings?: {
    id?: number; // If provided, update existing; otherwise create new
    name: string;
    dateOfBirth?: string;
    gender?: string;
    occupation?: string;
    maritalStatus?: string;
    contact?: string;
    isEmergencyContact?: boolean;
    _delete?: boolean; // Flag to delete this sibling
  }[];

  // User Association
  userId?: number;
}

/**
 * Employee Filters for List/Search
 */
export interface EmployeeFilters {
  // Pagination
  page?: number;
  limit?: number;

  // Search
  search?: string; // Searches firstName, lastName, email, employeeCode

  // Filter by relations
  departmentId?: number;
  designationId?: number;
  branchId?: number;
  employmentTypeId?: number;

  // Filter by status
  status?: string;
  isActive?: boolean;

  // Filter by date range
  dateOfJoiningFrom?: string;
  dateOfJoiningTo?: string;

  // Filter by salary range
  salaryMin?: number;
  salaryMax?: number;

  // Export specific employees
  employeeIds?: number[];
}

/**
 * Bulk Update Status Request
 */
export interface BulkUpdateStatusData {
  employeeIds: number[];
  status: string;
  isActive?: boolean;
}

/**
 * Employee Stats (for dashboard cards)
 */
export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
}

/**
 * Employee Status Constants
 */
export const EMPLOYEE_STATUS = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
  RESIGNED: 'Resigned',
} as const;

export type EmployeeStatus = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS];

/**
 * Marital Status Constants
 */
export const MARITAL_STATUS = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
} as const;

export type MaritalStatus = typeof MARITAL_STATUS[keyof typeof MARITAL_STATUS];

/**
 * Blood Group Constants
 */
export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
] as const;

export type BloodGroup = typeof BLOOD_GROUPS[number];

/**
 * Education Level Constants
 */
export const EDUCATION_LEVELS = {
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'Diploma',
  BACHELORS: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  DOCTORATE: 'Doctorate',
  OTHER: 'Other',
} as const;

export type EducationLevel = typeof EDUCATION_LEVELS[keyof typeof EDUCATION_LEVELS];

/**
 * Parent Status Constants
 */
export const PARENT_STATUS = {
  ALIVE: 'Alive',
  DECEASED: 'Deceased',
  UNKNOWN: 'Unknown',
} as const;

export type ParentStatus = typeof PARENT_STATUS[keyof typeof PARENT_STATUS];
