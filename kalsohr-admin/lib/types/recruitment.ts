/**
 * Recruitment Module Type Definitions
 * Contains types for Candidates, Applications, and Interview Schedules
 */

// ==================== Status & Mode Enums ====================

export const CANDIDATE_STATUS = {
  NEW: 'New',
  IN_PROCESS: 'In Process',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
} as const;

export type CandidateStatus = typeof CANDIDATE_STATUS[keyof typeof CANDIDATE_STATUS];

export const CANDIDATE_SOURCE = {
  LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri',
  INDEED: 'Indeed',
  REFERRAL: 'Referral',
  DIRECT: 'Direct',
  CAREER_PAGE: 'Career Page',
  OTHER: 'Other',
} as const;

export type CandidateSource = typeof CANDIDATE_SOURCE[keyof typeof CANDIDATE_SOURCE];

export const APPLICATION_STATUS = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

export const INTERVIEW_STATUS = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
} as const;

export type InterviewStatus = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

export const INTERVIEW_MODE = {
  IN_PERSON: 'In-person',
  VIDEO: 'Video',
  PHONE: 'Phone',
} as const;

export type InterviewMode = typeof INTERVIEW_MODE[keyof typeof INTERVIEW_MODE];

export const INTERVIEW_RESULT = {
  PASS: 'Pass',
  FAIL: 'Fail',
  ON_HOLD: 'On Hold',
} as const;

export type InterviewResult = typeof INTERVIEW_RESULT[keyof typeof INTERVIEW_RESULT];

// ==================== Base Interfaces ====================

export interface Candidate {
  id: number;
  organizationId: number;

  // Basic Information
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: Date | string | null;
  genderId: number | null;
  maritalStatusId: number | null;
  profilePicture: string | null;

  // Professional Details
  currentCompany: string | null;
  totalExperience: number | null; // in years
  currentSalary: number | null;
  expectedSalary: number | null;
  noticePeriod: number | null; // in days
  skills: string | null;
  qualifications: string | null;
  educationLevelId: number | null;

  // Family & Personal Details
  fatherName: string | null;
  fatherStatus: string | null;
  fatherOccupation: string | null;
  fatherContact: string | null;
  motherName: string | null;
  motherStatus: string | null;
  motherOccupation: string | null;
  motherContact: string | null;
  familyAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;

  // Application Details
  resume: string | null;
  source: CandidateSource | null;
  referredBy: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  cityId: number | null;
  postalCode: string | null;
  notes: string | null;
  status: CandidateStatus;

  // Relations (optional - loaded with includes)
  gender?: {
    id: number;
    name: string;
  };
  maritalStatus?: {
    id: number;
    name: string;
  };
  educationLevel?: {
    id: number;
    name: string;
  };
  city?: {
    id: number;
    name: string;
    stateId: number;
    state?: {
      id: number;
      name: string;
      countryId: number;
      country?: {
        id: number;
        name: string;
      };
    };
  };
  applications?: Application[];

  // Audit fields
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: number | null;
  updatedBy: number | null;
  creator?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
  updater?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
}

export interface Application {
  id: number;
  organizationId: number;
  candidateId: number;
  jobPositionId: number;
  appliedDate: Date | string;
  status: ApplicationStatus;
  notes: string | null;

  // Relations (optional - loaded with includes)
  candidate?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    profilePicture: string | null;
    totalExperience: number | null;
    currentCompany: string | null;
    expectedSalary: number | null;
    skills: string | null;
  };
  jobPosition?: {
    id: number;
    title: string;
    code: string;
    status: string;
    vacancies: number;
    department?: {
      id: number;
      name: string;
    };
  };
  interviewSchedules?: InterviewSchedule[];

  // Counts (from _count)
  _count?: {
    interviewSchedules: number;
  };

  // Audit fields
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: number | null;
  updatedBy: number | null;
  creator?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
  updater?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
}

export interface InterviewSchedule {
  id: number;
  organizationId: number;
  applicationId: number;
  roundName: string;
  interviewDate: Date | string;
  interviewMode: InterviewMode;
  location: string | null;
  meetingLink: string | null;
  interviewerId: number | null;
  status: InterviewStatus;
  feedback: string | null;
  rating: number | null; // 1-10 scale
  result: InterviewResult | null;
  notes: string | null;

  // Relations (optional - loaded with includes)
  application?: Application;
  interviewer?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };

  // Audit fields
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: number | null;
  updatedBy: number | null;
  creator?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
  updater?: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  };
}

// ==================== Filter Interfaces ====================

export interface CandidateFilters {
  page?: number;
  limit?: number;
  search?: string; // Searches: firstName, lastName, email, phone
  status?: CandidateStatus;
  source?: CandidateSource;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  genderId?: number;
  maritalStatusId?: number;
  cityId?: number;
}

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  jobPositionId?: number;
  candidateId?: number;
  appliedDateFrom?: string; // ISO date string
  appliedDateTo?: string; // ISO date string
}

export interface InterviewFilters {
  page?: number;
  limit?: number;
  status?: InterviewStatus;
  interviewerId?: number;
  jobPositionId?: number;
  interviewDateFrom?: string; // ISO date string
  interviewDateTo?: string; // ISO date string
  upcoming?: boolean; // Only upcoming interviews
}

// ==================== Create/Update DTOs ====================

export interface CreateCandidateData {
  // Basic Information (required fields)
  firstName: string;
  email: string;

  // Basic Information (optional)
  lastName?: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: Date | string;
  genderId?: number;
  maritalStatusId?: number;
  profilePicture?: File | null; // File upload

  // Professional Details
  currentCompany?: string;
  totalExperience?: number;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: number;
  skills?: string;
  qualifications?: string;
  educationLevelId?: number;

  // Family & Personal Details
  fatherName?: string;
  fatherStatus?: string;
  fatherOccupation?: string;
  fatherContact?: string;
  motherName?: string;
  motherStatus?: string;
  motherOccupation?: string;
  motherContact?: string;
  familyAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Application Details
  resume?: File | null; // File upload
  source?: CandidateSource;
  referredBy?: string;
  jobPositionId?: number; // If provided, auto-creates application
  currentAddress?: string;
  permanentAddress?: string;
  cityId?: number;
  postalCode?: string;
  notes?: string;
  status?: CandidateStatus;
}

export interface UpdateCandidateData extends Partial<CreateCandidateData> {
  // Same as CreateCandidateData but all fields optional
}

export interface CreateApplicationData {
  candidateId: number;
  jobPositionId: number;
  appliedDate?: Date | string;
  notes?: string;
}

export interface UpdateApplicationData {
  status?: ApplicationStatus;
  notes?: string;
}

export interface CreateInterviewScheduleData {
  applicationId: number;
  roundName: string;
  interviewDate: Date | string;
  interviewMode: InterviewMode;
  location?: string;
  meetingLink?: string;
  interviewerId?: number;
}

export interface UpdateInterviewScheduleData {
  roundName?: string;
  interviewDate?: Date | string;
  interviewMode?: InterviewMode;
  location?: string;
  meetingLink?: string;
  interviewerId?: number;
  status?: InterviewStatus;
}

export interface SubmitFeedbackData {
  feedback: string;
  rating: number; // 1-10
  result: InterviewResult;
}

// ==================== API Response Interfaces ====================

export interface CandidatesResponse {
  success: boolean;
  data: {
    candidates: Candidate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats?: {
      total: number;
      new: number;
      inProcess: number;
      selected: number;
      rejected: number;
      onHold: number;
    };
  };
  message: string;
}

export interface CandidateResponse {
  success: boolean;
  data: {
    candidate: Candidate;
  };
  message: string;
}

export interface ApplicationsResponse {
  success: boolean;
  data: {
    applications: Application[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

export interface ApplicationPipelineResponse {
  success: boolean;
  data: {
    pipeline: {
      Applied: Application[];
      Shortlisted: Application[];
      'Interview Scheduled': Application[];
      Selected: Application[];
      Rejected: Application[];
    };
    counts: {
      Applied: number;
      Shortlisted: number;
      'Interview Scheduled': number;
      Selected: number;
      Rejected: number;
      total: number;
    };
  };
  message: string;
}

export interface ApplicationResponse {
  success: boolean;
  data: {
    application: Application;
  };
  message: string;
}

export interface InterviewSchedulesResponse {
  success: boolean;
  data: {
    interviews: InterviewSchedule[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

export interface InterviewCalendarResponse {
  success: boolean;
  data: {
    interviews: Record<string, InterviewSchedule[]>; // Grouped by date (YYYY-MM-DD)
  };
  message: string;
}

export interface InterviewScheduleResponse {
  success: boolean;
  data: {
    interview: InterviewSchedule;
  };
  message: string;
}

// ==================== Utility Types ====================

export interface CandidateStatsCard {
  label: string;
  value: number;
  color: string;
  status?: CandidateStatus;
}

export interface ApplicationKanbanColumn {
  id: ApplicationStatus;
  title: string;
  applications: Application[];
  count: number;
  color: string;
}

export interface InterviewCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  status: InterviewStatus;
  interviewMode: InterviewMode;
  application?: Application;
  interviewer?: {
    id: number;
    firstName: string;
    lastName: string | null;
  };
}

// ==================== Candidate Comments ====================

/**
 * Section keys for candidate detail page
 * Each section can have its own discussion thread
 */
export const SECTION_KEYS = {
  // Overview Tab
  QUICK_INFO: 'quick_info',
  CONTACT_INFO: 'contact_info',
  APPLICATION_DETAILS: 'application_details',
  NOTES: 'notes',

  // Professional Tab
  PROFESSIONAL_INFO: 'professional_info',
  EDUCATION: 'education',
  SKILLS: 'skills',

  // Personal Tab
  PERSONAL_INFO: 'personal_info',
  ADDRESS_INFO: 'address_info',

  // Family Tab
  FATHER_INFO: 'father_info',
  MOTHER_INFO: 'mother_info',
  EMERGENCY_CONTACT: 'emergency_contact',
  FAMILY_ADDRESS: 'family_address',
} as const;

export type SectionKey = typeof SECTION_KEYS[keyof typeof SECTION_KEYS];

export interface CandidateComment {
  id: number;
  organizationId: number;
  candidateId: number;
  sectionKey: string;
  comment: string;
  rating: number | null; // 1-5 stars, only for top-level comments
  userId: number;
  parentCommentId: number | null;

  // Relations (loaded with includes)
  user?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  replies?: CandidateComment[];

  // Audit fields
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface CreateCommentData {
  sectionKey?: SectionKey;
  comment: string;
  rating?: number | null; // 1-5 stars
  parentCommentId?: number | null;
}

export interface UpdateCommentData {
  comment?: string;
  rating?: number | null;
}

export interface CommentsResponse {
  success: boolean;
  data: {
    comments: CandidateComment[];
    stats: {
      bySectionKey: Record<string, number>; // Count of comments per section
      unreadCounts: Record<string, number>; // Count of unread comments per section
    };
  };
  message: string;
}

export interface CommentResponse {
  success: boolean;
  data: {
    comment: CandidateComment;
  };
  message: string;
}
