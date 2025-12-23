import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';
import {
  Employee,
  EmployeesResponse,
  EmployeeResponse,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeFilters,
  BulkUpdateStatusData,
} from '@/lib/types/employee';

/**
 * Get all employees for an organization with pagination and filters
 */
export const getAllEmployees = async (
  orgSlug: string,
  filters?: EmployeeFilters
): Promise<EmployeesResponse['data']> => {
  try {
    const params = new URLSearchParams();

    // Pagination
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    // Search
    if (filters?.search) params.append('search', filters.search);

    // Filters
    if (filters?.departmentId) params.append('departmentId', String(filters.departmentId));
    if (filters?.designationId) params.append('designationId', String(filters.designationId));
    if (filters?.branchId) params.append('branchId', String(filters.branchId));
    if (filters?.employmentTypeId) params.append('employmentTypeId', String(filters.employmentTypeId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    // Date range
    if (filters?.dateOfJoiningFrom) params.append('dateOfJoiningFrom', filters.dateOfJoiningFrom);
    if (filters?.dateOfJoiningTo) params.append('dateOfJoiningTo', filters.dateOfJoiningTo);

    // Salary range
    if (filters?.salaryMin) params.append('salaryMin', String(filters.salaryMin));
    if (filters?.salaryMax) params.append('salaryMax', String(filters.salaryMax));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/employees?${queryString}`
      : `/api/v1/${orgSlug}/employees`;

    const response = await apiClient.get<EmployeesResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (orgSlug: string, id: number): Promise<Employee> => {
  try {
    const response = await apiClient.get<EmployeeResponse>(
      `/api/v1/${orgSlug}/employees/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employee;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create employee
 */
export const createEmployee = async (
  orgSlug: string,
  data: CreateEmployeeData,
  profilePictureFile?: File | null,
  idProofFile?: File | null
): Promise<Employee> => {
  try {
    let requestData: any;
    let headers: any = {};

    // If there's a file upload, use FormData
    if (profilePictureFile || idProofFile) {
      const formData = new FormData();

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      if (idProofFile) {
        formData.append('idProof', idProofFile);
      }

      // Append all other data as JSON string or individual fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      requestData = formData;
      // Remove Content-Type header - browser will set it with boundary
      headers = { 'Content-Type': undefined };
    } else {
      // Regular JSON request
      requestData = data;
    }

    const response = await apiClient.post<EmployeeResponse>(
      `/api/v1/${orgSlug}/employees`,
      requestData,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update employee
 */
export const updateEmployee = async (
  orgSlug: string,
  id: number,
  data: UpdateEmployeeData,
  profilePictureFile?: File | null,
  idProofFile?: File | null
): Promise<Employee> => {
  try {
    console.log('🔍 API - updateEmployee called with files:', {
      hasProfilePicture: !!profilePictureFile,
      profilePictureFileName: profilePictureFile?.name,
      hasIdProof: !!idProofFile,
      idProofFileName: idProofFile?.name,
    });

    let requestData: any;
    let headers: any = {};

    // If there's a file upload, use FormData
    if (profilePictureFile || idProofFile) {
      console.log('✅ Creating FormData with files');
      const formData = new FormData();

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      if (idProofFile) {
        formData.append('idProof', idProofFile);
      }

      // Append all other data as JSON string or individual fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      requestData = formData;
      // Remove Content-Type header - browser will set it with boundary
      headers = { 'Content-Type': undefined };
    } else {
      // Regular JSON request
      requestData = data;
    }

    const response = await apiClient.put<EmployeeResponse>(
      `/api/v1/${orgSlug}/employees/${id}`,
      requestData,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.employee;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/employees/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Export employees to CSV
 * Returns a Blob that can be downloaded
 */
export const exportEmployeesCSV = async (
  orgSlug: string,
  filters?: EmployeeFilters
): Promise<Blob> => {
  try {
    const params = new URLSearchParams();

    // Apply same filters as getAllEmployees
    if (filters?.search) params.append('search', filters.search);
    if (filters?.departmentId) params.append('departmentId', String(filters.departmentId));
    if (filters?.designationId) params.append('designationId', String(filters.designationId));
    if (filters?.branchId) params.append('branchId', String(filters.branchId));
    if (filters?.employmentTypeId) params.append('employmentTypeId', String(filters.employmentTypeId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.dateOfJoiningFrom) params.append('dateOfJoiningFrom', filters.dateOfJoiningFrom);
    if (filters?.dateOfJoiningTo) params.append('dateOfJoiningTo', filters.dateOfJoiningTo);
    if (filters?.salaryMin) params.append('salaryMin', String(filters.salaryMin));
    if (filters?.salaryMax) params.append('salaryMax', String(filters.salaryMax));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/employees/export/csv?${queryString}`
      : `/api/v1/${orgSlug}/employees/export/csv`;

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Bulk update employee status
 */
export const bulkUpdateEmployeeStatus = async (
  orgSlug: string,
  data: BulkUpdateStatusData
): Promise<void> => {
  try {
    const response = await apiClient.patch<ApiResponse>(
      `/api/v1/${orgSlug}/employees/bulk-status`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Helper function to download CSV blob
 */
export const downloadEmployeesCSV = (blob: Blob, filename: string = 'employees.csv') => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
