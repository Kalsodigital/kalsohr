import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';
import {
  updateApplicationOnInterviewScheduled,
  updateApplicationFromInterview
} from '../utils/status-sync';

// Validation constants
const VALID_INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'];
const VALID_INTERVIEW_MODES = ['In-person', 'Video', 'Phone'];
const VALID_RESULTS = ['Pass', 'Fail', 'On Hold'];

/**
 * Get all interview schedules for the organization
 * GET /api/:orgSlug/recruitment/interviews
 */
export const getAllInterviewSchedules = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const {
      page = 1,
      limit = 10,
      status,
      interviewerId,
      interviewDateFrom,
      interviewDateTo,
      jobPositionId,
    } = req.query;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Apply filters
    if (status) where.status = status as string;
    if (interviewerId) where.interviewerId = parseInt(interviewerId as string);
    if (jobPositionId) {
      where.application = {
        jobPositionId: parseInt(jobPositionId as string),
      };
    }

    // Date range filter
    if (interviewDateFrom || interviewDateTo) {
      where.interviewDate = {};
      if (interviewDateFrom) where.interviewDate.gte = new Date(interviewDateFrom as string);
      if (interviewDateTo) where.interviewDate.lte = new Date(interviewDateTo as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.interviewSchedule.count({ where });

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    // Get interview schedules with relations
    const interviews = await prisma.interviewSchedule.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { interviewDate: 'desc' },
      select: {
        id: true,
        roundName: true,
        interviewDate: true,
        interviewMode: true,
        location: true,
        meetingLink: true,
        status: true,
        feedback: true,
        rating: true,
        result: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        application: {
          select: {
            id: true,
            status: true,
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePicture: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);

    // Fetch creator and updater details if user has permission
    let interviewsWithAudit = interviews;
    if (canViewAudit) {
      const userIds = new Set<number>();
      interviews.forEach(interview => {
        if (interview.createdBy) userIds.add(interview.createdBy);
        if (interview.updatedBy) userIds.add(interview.updatedBy);
      });

      if (userIds.size > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        interviewsWithAudit = interviews.map(interview => ({
          ...interview,
          creator: interview.createdBy ? userMap.get(interview.createdBy) : null,
          updater: interview.updatedBy ? userMap.get(interview.updatedBy) : null,
        }));
      }
    }

    return sendSuccess(
      res,
      {
        interviews: interviewsWithAudit,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      'Interview schedules retrieved successfully'
    );
  } catch (error) {
    console.error('Get interview schedules error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get interview schedules grouped by date (for calendar view)
 * GET /api/:orgSlug/recruitment/interviews/calendar
 */
export const getInterviewSchedulesByDate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { startDate, endDate } = req.query;

    const where: any = {
      organizationId,
    };

    // Date range filter
    if (startDate || endDate) {
      where.interviewDate = {};
      if (startDate) where.interviewDate.gte = new Date(startDate as string);
      if (endDate) where.interviewDate.lte = new Date(endDate as string);
    }

    // Get interview schedules
    const interviews = await prisma.interviewSchedule.findMany({
      where,
      orderBy: { interviewDate: 'asc' },
      select: {
        id: true,
        roundName: true,
        interviewDate: true,
        interviewMode: true,
        status: true,
        application: {
          select: {
            id: true,
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by date
    const groupedByDate: { [key: string]: any[] } = {};
    interviews.forEach(interview => {
      const dateKey = new Date(interview.interviewDate).toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(interview);
    });

    return sendSuccess(
      res,
      {
        interviews: groupedByDate,
        total: interviews.length,
      },
      'Calendar interviews retrieved successfully'
    );
  } catch (error) {
    console.error('Get calendar interviews error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get my interviews (where user is the interviewer)
 * GET /api/:orgSlug/recruitment/interviews/my-interviews
 */
export const getMyInterviews = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { status, upcoming } = req.query;

    const where: any = {
      organizationId,
      interviewerId: userId,
    };

    // Apply status filter
    if (status) {
      where.status = status as string;
    }

    // Filter upcoming interviews
    if (upcoming === 'true') {
      where.interviewDate = {
        gte: new Date(),
      };
      where.status = {
        in: ['Scheduled', 'Rescheduled'],
      };
    }

    // Get my interviews
    const interviews = await prisma.interviewSchedule.findMany({
      where,
      orderBy: { interviewDate: 'asc' },
      select: {
        id: true,
        roundName: true,
        interviewDate: true,
        interviewMode: true,
        location: true,
        meetingLink: true,
        status: true,
        feedback: true,
        rating: true,
        result: true,
        application: {
          select: {
            id: true,
            status: true,
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                totalExperience: true,
                currentCompany: true,
                skills: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(
      res,
      {
        interviews,
        total: interviews.length,
      },
      'My interviews retrieved successfully'
    );
  } catch (error) {
    console.error('Get my interviews error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get interview schedule by ID
 * GET /api/:orgSlug/recruitment/interviews/:id
 */
export const getInterviewScheduleById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    const interview = await prisma.interviewSchedule.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        application: {
          include: {
            candidate: true,
            jobPosition: {
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!interview) {
      return sendError(res, 'Interview schedule not found', STATUS_CODES.NOT_FOUND);
    }

    // Fetch creator and updater details if permitted
    let result: any = interview;
    if (canViewAudit && (interview.createdBy || interview.updatedBy)) {
      const userIds = [];
      if (interview.createdBy) userIds.push(interview.createdBy);
      if (interview.updatedBy) userIds.push(interview.updatedBy);

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      result = {
        ...interview,
        creator: interview.createdBy ? userMap.get(interview.createdBy) : null,
        updater: interview.updatedBy ? userMap.get(interview.updatedBy) : null,
      };
    }

    return sendSuccess(res, { interview: result }, 'Interview schedule retrieved successfully');
  } catch (error) {
    console.error('Get interview schedule error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create interview schedule
 * POST /api/:orgSlug/recruitment/interviews
 */
export const createInterviewSchedule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const {
      applicationId,
      roundName,
      interviewDate,
      interviewMode,
      interviewerId,
      location,
      meetingLink,
    } = req.body;

    // Validation
    if (!applicationId) {
      return sendError(res, 'Application is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!roundName || !roundName.trim()) {
      return sendError(res, 'Round name is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!interviewDate) {
      return sendError(res, 'Interview date is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!interviewMode) {
      return sendError(res, 'Interview mode is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate interview mode
    if (!VALID_INTERVIEW_MODES.includes(interviewMode)) {
      return sendError(
        res,
        `Invalid interview mode. Must be one of: ${VALID_INTERVIEW_MODES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate mode-specific requirements
    if (interviewMode === 'In-person' && !location) {
      return sendError(res, 'Location is required for in-person interviews', STATUS_CODES.BAD_REQUEST);
    }

    if ((interviewMode === 'Video' || interviewMode === 'Phone') && !meetingLink) {
      return sendError(
        res,
        'Meeting link is required for video/phone interviews',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate interview date is in the future (allow 5 minute buffer for network latency)
    const interviewDateTime = new Date(interviewDate);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (interviewDateTime < fiveMinutesAgo) {
      return sendError(res, 'Interview date must be in the future', STATUS_CODES.BAD_REQUEST);
    }

    // Check if application exists
    const application = await prisma.application.findFirst({
      where: {
        id: parseInt(applicationId),
        organizationId,
      },
    });

    if (!application) {
      return sendError(res, 'Application not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if interviewer exists (optional field)
    if (interviewerId) {
      const interviewer = await prisma.user.findFirst({
        where: {
          id: parseInt(interviewerId),
          organizationId,
        },
      });

      if (!interviewer) {
        return sendError(res, 'Interviewer not found', STATUS_CODES.NOT_FOUND);
      }
    }

    // Create interview schedule
    const interview = await prisma.interviewSchedule.create({
      data: {
        organizationId,
        applicationId: parseInt(applicationId),
        roundName: roundName.trim(),
        interviewDate: interviewDateTime,
        interviewMode,
        interviewerId: interviewerId ? parseInt(interviewerId) : null,
        location: location?.trim() || null,
        meetingLink: meetingLink?.trim() || null,
        status: 'Scheduled',
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        application: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Auto-update application status to 'Interview Scheduled' and cascade to candidate
    await updateApplicationOnInterviewScheduled(parseInt(applicationId), userId);

    return sendSuccess(res, { interview }, 'Interview scheduled successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create interview schedule error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update interview schedule
 * PUT /api/:orgSlug/recruitment/interviews/:id
 */
export const updateInterviewSchedule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      roundName,
      interviewDate,
      interviewMode,
      interviewerId,
      location,
      meetingLink,
      status,
    } = req.body;

    // Check if interview exists
    const existingInterview = await prisma.interviewSchedule.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingInterview) {
      return sendError(res, 'Interview schedule not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate status if provided
    if (status && !VALID_INTERVIEW_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_INTERVIEW_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate interview mode if provided
    if (interviewMode && !VALID_INTERVIEW_MODES.includes(interviewMode)) {
      return sendError(
        res,
        `Invalid interview mode. Must be one of: ${VALID_INTERVIEW_MODES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate roundName if provided
    if (roundName !== undefined && (!roundName || !roundName.trim())) {
      return sendError(res, 'Round name cannot be empty', STATUS_CODES.BAD_REQUEST);
    }

    // Validate interview date if provided (allow 5 minute buffer for network latency)
    if (interviewDate) {
      const interviewDateTime = new Date(interviewDate);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (interviewDateTime < fiveMinutesAgo) {
        return sendError(res, 'Interview date must be in the future', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Validate mode-specific requirements
    const finalMode = interviewMode || existingInterview.interviewMode;
    if (finalMode === 'In-person' && interviewMode && !location && !existingInterview.location) {
      return sendError(res, 'Location is required for in-person interviews', STATUS_CODES.BAD_REQUEST);
    }

    if ((finalMode === 'Video' || finalMode === 'Phone') && interviewMode && !meetingLink && !existingInterview.meetingLink) {
      return sendError(
        res,
        'Meeting link is required for video/phone interviews',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Update interview schedule
    const updateData: any = {
      updatedBy: userId,
    };

    if (roundName !== undefined) updateData.roundName = roundName.trim();
    if (interviewDate) updateData.interviewDate = new Date(interviewDate);
    if (interviewMode) updateData.interviewMode = interviewMode;
    if (interviewerId !== undefined) updateData.interviewerId = interviewerId ? parseInt(interviewerId) : null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink?.trim() || null;
    if (status) updateData.status = status;

    const interview = await prisma.interviewSchedule.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        application: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, { interview }, 'Interview schedule updated successfully');
  } catch (error) {
    console.error('Update interview schedule error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Submit feedback for interview
 * PATCH /api/:orgSlug/recruitment/interviews/:id/feedback
 */
export const submitFeedback = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { feedback, rating, result } = req.body;

    // Validation
    if (!feedback) {
      return sendError(res, 'Feedback is required', STATUS_CODES.BAD_REQUEST);
    }

    if (rating !== undefined) {
      const ratingNum = parseInt(rating);
      if (ratingNum < 1 || ratingNum > 10) {
        return sendError(res, 'Rating must be between 1 and 10', STATUS_CODES.BAD_REQUEST);
      }
    }

    if (result && !VALID_RESULTS.includes(result)) {
      return sendError(
        res,
        `Invalid result. Must be one of: ${VALID_RESULTS.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if interview exists
    const existingInterview = await prisma.interviewSchedule.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingInterview) {
      return sendError(res, 'Interview schedule not found', STATUS_CODES.NOT_FOUND);
    }

    // Update interview with feedback
    const interview = await prisma.interviewSchedule.update({
      where: { id: parseInt(id) },
      data: {
        feedback,
        rating: rating ? parseInt(rating) : null,
        result,
        status: 'Completed',
        updatedBy: userId,
      },
      include: {
        application: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            jobPosition: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Auto-update application and candidate status based on interview result
    if (result) {
      await updateApplicationFromInterview(
        existingInterview.applicationId,
        result,
        existingInterview.roundName,
        userId
      );
    }

    return sendSuccess(res, { interview }, 'Feedback submitted successfully');
  } catch (error) {
    console.error('Submit feedback error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete interview schedule (cancel)
 * DELETE /api/:orgSlug/recruitment/interviews/:id
 */
export const deleteInterviewSchedule = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if interview exists
    const interview = await prisma.interviewSchedule.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!interview) {
      return sendError(res, 'Interview schedule not found', STATUS_CODES.NOT_FOUND);
    }

    // Delete interview schedule
    await prisma.interviewSchedule.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Interview schedule cancelled successfully');
  } catch (error) {
    console.error('Delete interview schedule error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
