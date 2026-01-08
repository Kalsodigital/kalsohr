import apiClient, { handleApiError } from '../client';
import {
  Candidate,
  Application,
  InterviewSchedule,
  CandidatesResponse,
  CandidateResponse,
  ApplicationsResponse,
  ApplicationPipelineResponse,
  ApplicationResponse,
  InterviewSchedulesResponse,
  InterviewCalendarResponse,
  InterviewScheduleResponse,
  CreateCandidateData,
  UpdateCandidateData,
  CreateApplicationData,
  UpdateApplicationData,
  CreateInterviewScheduleData,
  UpdateInterviewScheduleData,
  SubmitFeedbackData,
  CandidateFilters,
  ApplicationFilters,
  InterviewFilters,
  CandidateComment,
  CreateCommentData,
  UpdateCommentData,
  CommentsResponse,
  CommentResponse,
  SectionKey,
} from '@/lib/types/recruitment';
import { ApiResponse } from '@/lib/types/api';

// ==================== Candidate API Functions ====================

/**
 * Get all candidates for an organization with pagination and filters
 */
export const getAllCandidates = async (
  orgSlug: string,
  filters?: CandidateFilters
): Promise<CandidatesResponse['data']> => {
  try {
    const params = new URLSearchParams();

    // Pagination
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    // Search
    if (filters?.search) params.append('search', filters.search);

    // Filters
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.genderId) params.append('genderId', String(filters.genderId));
    if (filters?.maritalStatusId) params.append('maritalStatusId', String(filters.maritalStatusId));
    if (filters?.cityId) params.append('cityId', String(filters.cityId));

    // Experience range
    if (filters?.minExperience !== undefined) params.append('minExperience', String(filters.minExperience));
    if (filters?.maxExperience !== undefined) params.append('maxExperience', String(filters.maxExperience));

    // Salary range
    if (filters?.minSalary !== undefined) params.append('minSalary', String(filters.minSalary));
    if (filters?.maxSalary !== undefined) params.append('maxSalary', String(filters.maxSalary));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/candidates?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/candidates`;

    const response = await apiClient.get<CandidatesResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get candidate by ID
 */
export const getCandidateById = async (orgSlug: string, id: number): Promise<Candidate> => {
  try {
    const response = await apiClient.get<CandidateResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.candidate;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create candidate with optional file uploads (resume and profile picture)
 */
export const createCandidate = async (
  orgSlug: string,
  data: CreateCandidateData,
  resumeFile?: File | null,
  profilePictureFile?: File | null
): Promise<Candidate> => {
  try {
    let requestData: any;
    let headers: any = {};

    // If there's a file upload, use FormData
    if (resumeFile || profilePictureFile) {
      const formData = new FormData();

      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      // Append all other data as individual fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null && key !== 'resume' && key !== 'profilePicture') {
          if (typeof value === 'object' && value instanceof Date) {
            formData.append(key, value.toISOString());
          } else if (typeof value === 'object') {
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

    const response = await apiClient.post<CandidateResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates`,
      requestData,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.candidate;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update candidate with optional file uploads
 */
export const updateCandidate = async (
  orgSlug: string,
  id: number,
  data: UpdateCandidateData,
  resumeFile?: File | null,
  profilePictureFile?: File | null
): Promise<Candidate> => {
  try {
    let requestData: any;
    let headers: any = {};

    // If there's a file upload, use FormData
    if (resumeFile || profilePictureFile) {
      const formData = new FormData();

      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      // Append all other data as individual fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null && key !== 'resume' && key !== 'profilePicture') {
          if (typeof value === 'object' && value instanceof Date) {
            formData.append(key, value.toISOString());
          } else if (typeof value === 'object') {
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

    const response = await apiClient.put<CandidateResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${id}`,
      requestData,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.candidate;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete candidate
 */
export const deleteCandidate = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Export candidates to CSV
 */
export const exportCandidatesCSV = async (
  orgSlug: string,
  filters?: CandidateFilters
): Promise<Blob> => {
  try {
    const params = new URLSearchParams();

    // Apply same filters as getAllCandidates
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.genderId) params.append('genderId', String(filters.genderId));
    if (filters?.maritalStatusId) params.append('maritalStatusId', String(filters.maritalStatusId));
    if (filters?.cityId) params.append('cityId', String(filters.cityId));
    if (filters?.minExperience !== undefined) params.append('minExperience', String(filters.minExperience));
    if (filters?.maxExperience !== undefined) params.append('maxExperience', String(filters.maxExperience));
    if (filters?.minSalary !== undefined) params.append('minSalary', String(filters.minSalary));
    if (filters?.maxSalary !== undefined) params.append('maxSalary', String(filters.maxSalary));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/candidates/export/csv?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/candidates/export/csv`;

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== Application API Functions ====================

/**
 * Get all applications with pagination and filters
 */
export const getAllApplications = async (
  orgSlug: string,
  filters?: ApplicationFilters
): Promise<ApplicationsResponse['data']> => {
  try {
    const params = new URLSearchParams();

    // Pagination
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    // Filters
    if (filters?.status) params.append('status', filters.status);
    if (filters?.jobPositionId) params.append('jobPositionId', String(filters.jobPositionId));
    if (filters?.candidateId) params.append('candidateId', String(filters.candidateId));

    // Date range
    if (filters?.appliedDateFrom) params.append('appliedDateFrom', filters.appliedDateFrom);
    if (filters?.appliedDateTo) params.append('appliedDateTo', filters.appliedDateTo);

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/applications?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/applications`;

    const response = await apiClient.get<ApplicationsResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get application pipeline (Kanban board data)
 */
export const getApplicationPipeline = async (
  orgSlug: string,
  jobPositionId?: number
): Promise<ApplicationPipelineResponse['data']> => {
  try {
    const params = new URLSearchParams();
    if (jobPositionId) params.append('jobPositionId', String(jobPositionId));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/applications/pipeline?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/applications/pipeline`;

    const response = await apiClient.get<ApplicationPipelineResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get application by ID
 */
export const getApplicationById = async (orgSlug: string, id: number): Promise<Application> => {
  try {
    const response = await apiClient.get<ApplicationResponse>(
      `/api/v1/${orgSlug}/recruitment/applications/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.application;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create application
 */
export const createApplication = async (
  orgSlug: string,
  data: CreateApplicationData
): Promise<Application> => {
  try {
    const response = await apiClient.post<ApplicationResponse>(
      `/api/v1/${orgSlug}/recruitment/applications`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.application;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update application
 */
export const updateApplication = async (
  orgSlug: string,
  id: number,
  data: UpdateApplicationData
): Promise<Application> => {
  try {
    const response = await apiClient.put<ApplicationResponse>(
      `/api/v1/${orgSlug}/recruitment/applications/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.application;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update application status (for Kanban drag-and-drop)
 */
export const updateApplicationStatus = async (
  orgSlug: string,
  id: number,
  status: string,
  notes?: string
): Promise<Application> => {
  try {
    const response = await apiClient.patch<ApplicationResponse>(
      `/api/v1/${orgSlug}/recruitment/applications/${id}/status`,
      { status, notes }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.application;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete application
 */
export const deleteApplication = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/recruitment/applications/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== Interview Schedule API Functions ====================

/**
 * Get all interview schedules with pagination and filters
 */
export const getAllInterviewSchedules = async (
  orgSlug: string,
  filters?: InterviewFilters
): Promise<InterviewSchedulesResponse['data']> => {
  try {
    const params = new URLSearchParams();

    // Pagination
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    // Filters
    if (filters?.status) params.append('status', filters.status);
    if (filters?.interviewerId) params.append('interviewerId', String(filters.interviewerId));
    if (filters?.jobPositionId) params.append('jobPositionId', String(filters.jobPositionId));
    if (filters?.upcoming !== undefined) params.append('upcoming', String(filters.upcoming));

    // Date range
    if (filters?.interviewDateFrom) params.append('interviewDateFrom', filters.interviewDateFrom);
    if (filters?.interviewDateTo) params.append('interviewDateTo', filters.interviewDateTo);

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/interviews?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/interviews`;

    const response = await apiClient.get<InterviewSchedulesResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get interview schedules grouped by date (for calendar view)
 */
export const getInterviewSchedulesByDate = async (
  orgSlug: string,
  startDate?: string,
  endDate?: string
): Promise<InterviewCalendarResponse['data']> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/interviews/calendar?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/interviews/calendar`;

    const response = await apiClient.get<InterviewCalendarResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get my interviews (where current user is the interviewer)
 */
export const getMyInterviews = async (
  orgSlug: string,
  upcoming?: boolean
): Promise<InterviewSchedule[]> => {
  try {
    const params = new URLSearchParams();
    if (upcoming !== undefined) params.append('upcoming', String(upcoming));

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/interviews/my-interviews?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/interviews/my-interviews`;

    const response = await apiClient.get<{ success: boolean; data: { interviews: InterviewSchedule[] }; message: string }>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.interviews;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get interview schedule by ID
 */
export const getInterviewScheduleById = async (
  orgSlug: string,
  id: number
): Promise<InterviewSchedule> => {
  try {
    const response = await apiClient.get<InterviewScheduleResponse>(
      `/api/v1/${orgSlug}/recruitment/interviews/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.interview;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create interview schedule
 */
export const createInterviewSchedule = async (
  orgSlug: string,
  data: CreateInterviewScheduleData
): Promise<InterviewSchedule> => {
  try {
    const response = await apiClient.post<InterviewScheduleResponse>(
      `/api/v1/${orgSlug}/recruitment/interviews`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.interview;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update interview schedule
 */
export const updateInterviewSchedule = async (
  orgSlug: string,
  id: number,
  data: UpdateInterviewScheduleData
): Promise<InterviewSchedule> => {
  try {
    const response = await apiClient.put<InterviewScheduleResponse>(
      `/api/v1/${orgSlug}/recruitment/interviews/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.interview;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Submit interview feedback
 */
export const submitFeedback = async (
  orgSlug: string,
  id: number,
  data: SubmitFeedbackData
): Promise<InterviewSchedule> => {
  try {
    const response = await apiClient.patch<InterviewScheduleResponse>(
      `/api/v1/${orgSlug}/recruitment/interviews/${id}/feedback`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.interview;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete interview schedule
 */
export const deleteInterviewSchedule = async (orgSlug: string, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/recruitment/interviews/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== Candidate Comments API Functions ====================

/**
 * Get all comments for a candidate, optionally filtered by section
 */
export const getCandidateComments = async (
  orgSlug: string,
  candidateId: number,
  sectionKey?: SectionKey
): Promise<CommentsResponse['data']> => {
  try {
    const params = new URLSearchParams();
    if (sectionKey) params.append('sectionKey', sectionKey);

    const queryString = params.toString();
    const url = queryString
      ? `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments?${queryString}`
      : `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments`;

    const response = await apiClient.get<CommentsResponse>(url);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create a new comment or reply
 */
export const createCandidateComment = async (
  orgSlug: string,
  candidateId: number,
  data: CreateCommentData
): Promise<CandidateComment> => {
  try {
    const response = await apiClient.post<CommentResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.comment;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update an existing comment
 */
export const updateCandidateComment = async (
  orgSlug: string,
  candidateId: number,
  commentId: number,
  data: UpdateCommentData
): Promise<CandidateComment> => {
  try {
    const response = await apiClient.put<CommentResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments/${commentId}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data.comment;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete a comment
 */
export const deleteCandidateComment = async (
  orgSlug: string,
  candidateId: number,
  commentId: number
): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments/${commentId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Mark comments as viewed for a specific section
 */
export const markCommentsAsViewed = async (
  orgSlug: string,
  candidateId: number,
  sectionKey: SectionKey
): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse>(
      `/api/v1/${orgSlug}/recruitment/candidates/${candidateId}/comments/mark-viewed`,
      { sectionKey }
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get recent comments for dashboard widget
 */
export const getRecentComments = async (
  orgSlug: string,
  limit: number = 10
): Promise<any[]> => {
  try {
    const response = await apiClient.get<{ success: boolean; data: any[]; message: string }>(
      `/api/v1/${orgSlug}/recruitment/dashboard/recent-comments?limit=${limit}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
