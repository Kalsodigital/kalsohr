import apiClient, { handleApiError } from './client';
import { ApiResponse } from '@/lib/types/api';
import { LoginCredentials, LoginResponse, User } from '@/lib/types/auth';

/**
 * Login user
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/api/v1/auth/login',
      credentials
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
 * Get current user
 */
export const getCurrentUser = async (): Promise<{ user: User }> => {
  try {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(
      '/api/v1/auth/me'
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
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/api/v1/auth/logout');
  } catch (error) {
    // Ignore logout errors, still clear local storage
    console.error('Logout error:', error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string): Promise<string> => {
  try {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/api/v1/auth/refresh',
      { refreshToken }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.accessToken;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
