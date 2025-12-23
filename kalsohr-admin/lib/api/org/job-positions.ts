import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';

export interface JobPosition {
  id: number;
  organizationId: number;
  title: string;
  code: string | null;
  description: string | null;
  departmentId: number | null;
  requiredSkills: string | null;
  requiredQualifications: string | null;
  minExperience: number;
  maxExperience: number | null;
  vacancies: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'On Hold' | 'Filled' | 'Closed';
  postedDate: string | null;
  closingDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
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
  department?: {
    id: number;
    name: string;
    code: string | null;
  };
  _count?: {
    applications: number;
  };
}

export interface CreateJobPositionData {
  title: string;
  code?: string;
  description?: string;
  departmentId?: number;
  requiredSkills?: string;
  requiredQualifications?: string;
  minExperience?: number;
  maxExperience?: number;
  vacancies?: number;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'On Hold' | 'Filled' | 'Closed';
  postedDate?: string;
  closingDate?: string;
}

export interface UpdateJobPositionData extends Partial<CreateJobPositionData> {}

export interface JobPositionFilters {
  status?: string;
  departmentId?: number;
  priority?: string;
}

/**
 * Get all job positions for an organization
 */
export const getAllJobPositions = async (
  orgSlug: string,
  filters?: JobPositionFilters
): Promise<JobPosition[]> => {
  try {
    const params = new URLSearchParams();

    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.departmentId !== undefined) {
      params.append('departmentId', String(filters.departmentId));
    }
    if (filters?.priority) {
      params.append('priority', filters.priority);
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/masters/job-positions?${queryString}`
      : `/api/v1/${orgSlug}/masters/job-positions`;

    const response = await apiClient.get<ApiResponse<{ jobPositions: JobPosition[] }>>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.jobPositions;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get job position by ID
 */
export const getJobPositionById = async (orgSlug: string, id: number): Promise<JobPosition> => {
  try {
    const response = await apiClient.get<ApiResponse<{ jobPosition: JobPosition }>>(
      `/api/v1/${orgSlug}/masters/job-positions/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.jobPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create job position
 */
export const createJobPosition = async (
  orgSlug: string,
  data: CreateJobPositionData
): Promise<JobPosition> => {
  try {
    const response = await apiClient.post<ApiResponse<{ jobPosition: JobPosition }>>(
      `/api/v1/${orgSlug}/masters/job-positions`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.jobPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update job position
 */
export const updateJobPosition = async (
  orgSlug: string,
  id: number,
  data: UpdateJobPositionData
): Promise<JobPosition> => {
  try {
    const response = await apiClient.put<ApiResponse<{ jobPosition: JobPosition }>>(
      `/api/v1/${orgSlug}/masters/job-positions/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.jobPosition;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete job position
 */
export const deleteJobPosition = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/masters/job-positions/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
