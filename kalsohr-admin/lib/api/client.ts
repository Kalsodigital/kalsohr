import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '@/lib/types/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token and impersonation header
apiClient.interceptors.request.use(
  (config) => {
    console.log('🔍 API Client: Request starting', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });

    // Get token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Check if user is impersonating an organization
      // This header tells the backend that a super admin is in support mode
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const authData = JSON.parse(authStorage);
          if (authData.state?.impersonatedOrg && authData.state?.user?.isSuperAdmin) {
            const orgSlug = authData.state.impersonatedOrg.slug;
            config.headers['X-Impersonate-Org'] = orgSlug;

            console.log('🔍 API Client: Adding impersonation header', {
              orgSlug,
              url: config.url,
              isSuperAdmin: authData.state.user.isSuperAdmin,
              platformRole: authData.state.user.role?.name,
              note: 'Using platform role permissions'
            });
          } else {
            console.log('🔍 API Client: No impersonation', {
              hasImpersonatedOrg: !!authData.state?.impersonatedOrg,
              isSuperAdmin: authData.state?.user?.isSuperAdmin,
              url: config.url
            });
          }
        } catch (e) {
          console.error('❌ Failed to parse auth-storage:', e);
        }
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ API Client: Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Client: Response received', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    console.error('❌ API Client: Response error', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      status: error?.response?.status || 'NO_STATUS',
      url: error?.config?.url || 'NO_URL',
      data: error?.response?.data || 'NO_DATA',
      hasResponse: !!error?.response,
      hasConfig: !!error?.config
    });

    // Log the full error object separately
    console.error('Full error object:', error);

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle forbidden access (403)
    if (error.response?.status === 403) {
      console.log('🚫 API Client: Forbidden - redirecting to /forbidden');
      if (typeof window !== 'undefined') {
        window.location.href = '/forbidden';
      }
      return Promise.reject(error);
    }

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post<ApiResponse>(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { refreshToken }
          );

          if (response.data.success && response.data.data.accessToken) {
            const newAccessToken = response.data.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.message || axiosError.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
