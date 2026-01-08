import apiClient, { handleApiError } from '../client';
import { ApiResponse } from '@/lib/types/api';
import {
  OrganizationProfileData,
  UpdateOrganizationProfileData,
  UpdateOrganizationSettingsData,
  Organization,
} from '@/lib/types/organization';

/**
 * Get organization profile with statistics
 */
export const getOrganizationProfile = async (
  orgSlug: string
): Promise<OrganizationProfileData> => {
  try {
    const response = await apiClient.get<ApiResponse<OrganizationProfileData>>(
      `/api/v1/${orgSlug}/organization/profile`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch organization profile');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update organization profile
 * Supports both JSON data and FormData (with logo file)
 */
export const updateOrganizationProfile = async (
  orgSlug: string,
  data: UpdateOrganizationProfileData,
  logoFile?: File | null
): Promise<Organization> => {
  try {
    let requestData: any = data;
    let headers: any = {};

    // If logo file provided, use FormData
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);

      // Append all other fields to FormData
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      requestData = formData;
      // Let axios set the Content-Type with boundary for multipart/form-data
      headers['Content-Type'] = undefined;
    }

    const response = await apiClient.put<ApiResponse<Organization>>(
      `/api/v1/${orgSlug}/organization/profile`,
      requestData,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update organization profile');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update organization settings (timezone, etc.)
 */
export const updateOrganizationSettings = async (
  orgSlug: string,
  data: UpdateOrganizationSettingsData
): Promise<Organization> => {
  try {
    const response = await apiClient.put<ApiResponse<Organization>>(
      `/api/v1/${orgSlug}/organization/settings`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update organization settings');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
