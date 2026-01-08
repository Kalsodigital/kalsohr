import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';
import { updateCandidateStatusFromApplications } from '../utils/status-sync';

// Validation constants
const VALID_APPLICATION_STATUSES = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'];

/**
 * Get all applications for the organization
 * GET /api/:orgSlug/recruitment/applications
 */
export const getAllApplications = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const {
      page = 1,
      limit = 10,
      status,
      jobPositionId,
      candidateId,
      appliedDateFrom,
      appliedDateTo,
    } = req.query;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Apply filters
    if (status) where.status = status as string;
    if (jobPositionId) where.jobPositionId = parseInt(jobPositionId as string);
    if (candidateId) where.candidateId = parseInt(candidateId as string);

    // Date range filter
    if (appliedDateFrom || appliedDateTo) {
      where.appliedDate = {};
      if (appliedDateFrom) where.appliedDate.gte = new Date(appliedDateFrom as string);
      if (appliedDateTo) where.appliedDate.lte = new Date(appliedDateTo as string);
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await prisma.application.count({ where });

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    // Get applications with relations
    const applications = await prisma.application.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { appliedDate: 'desc' },
      select: {
        id: true,
        appliedDate: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePicture: true,
            totalExperience: true,
            currentCompany: true,
            expectedSalary: true,
            skills: true,
          },
        },
        jobPosition: {
          select: {
            id: true,
            title: true,
            code: true,
            status: true,
            vacancies: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            interviewSchedules: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);

    // Fetch creator and updater details if user has permission
    let applicationsWithAudit = applications;
    if (canViewAudit) {
      const userIds = new Set<number>();
      applications.forEach(app => {
        if (app.createdBy) userIds.add(app.createdBy);
        if (app.updatedBy) userIds.add(app.updatedBy);
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

        applicationsWithAudit = applications.map(app => ({
          ...app,
          creator: app.createdBy ? userMap.get(app.createdBy) : null,
          updater: app.updatedBy ? userMap.get(app.updatedBy) : null,
        }));
      }
    }

    return sendSuccess(
      res,
      {
        applications: applicationsWithAudit,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      'Applications retrieved successfully'
    );
  } catch (error) {
    console.error('Get applications error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get application pipeline (Kanban data grouped by status)
 * GET /api/:orgSlug/recruitment/applications/pipeline
 */
export const getApplicationPipeline = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { jobPositionId } = req.query;

    const where: any = {
      organizationId,
    };

    if (jobPositionId) {
      where.jobPositionId = parseInt(jobPositionId as string);
    }

    // Get applications grouped by status
    const applications = await prisma.application.findMany({
      where,
      orderBy: { appliedDate: 'desc' },
      select: {
        id: true,
        appliedDate: true,
        status: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            totalExperience: true,
          },
        },
        jobPosition: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            interviewSchedules: true,
          },
        },
      },
    });

    // Group by status
    const pipeline = {
      Applied: applications.filter(app => app.status === 'Applied'),
      Shortlisted: applications.filter(app => app.status === 'Shortlisted'),
      'Interview Scheduled': applications.filter(app => app.status === 'Interview Scheduled'),
      Selected: applications.filter(app => app.status === 'Selected'),
      Rejected: applications.filter(app => app.status === 'Rejected'),
    };

    // Calculate counts
    const counts = {
      Applied: pipeline.Applied.length,
      Shortlisted: pipeline.Shortlisted.length,
      'Interview Scheduled': pipeline['Interview Scheduled'].length,
      Selected: pipeline.Selected.length,
      Rejected: pipeline.Rejected.length,
      total: applications.length,
    };

    return sendSuccess(
      res,
      {
        pipeline,
        counts,
      },
      'Application pipeline retrieved successfully'
    );
  } catch (error) {
    console.error('Get application pipeline error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get application by ID
 * GET /api/:orgSlug/recruitment/applications/:id
 */
export const getApplicationById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const canViewAudit = await canViewAuditInfo(user, 'recruitment');

    const application = await prisma.application.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
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
        interviewSchedules: {
          include: {
            interviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            interviewDate: 'asc',
          },
        },
      },
    });

    if (!application) {
      return sendError(res, 'Application not found', STATUS_CODES.NOT_FOUND);
    }

    // Fetch creator and updater details if permitted
    let result: any = application;
    if (canViewAudit && (application.createdBy || application.updatedBy)) {
      const userIds = [];
      if (application.createdBy) userIds.push(application.createdBy);
      if (application.updatedBy) userIds.push(application.updatedBy);

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
        ...application,
        creator: application.createdBy ? userMap.get(application.createdBy) : null,
        updater: application.updatedBy ? userMap.get(application.updatedBy) : null,
      };
    }

    return sendSuccess(res, { application: result }, 'Application retrieved successfully');
  } catch (error) {
    console.error('Get application error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create application
 * POST /api/:orgSlug/recruitment/applications
 */
export const createApplication = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { candidateId, jobPositionId, appliedDate, notes } = req.body;

    // Validation
    if (!candidateId) {
      return sendError(res, 'Candidate is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!jobPositionId) {
      return sendError(res, 'Job position is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if candidate exists
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: parseInt(candidateId),
        organizationId,
      },
    });

    if (!candidate) {
      return sendError(res, 'Candidate not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if job position exists
    const jobPosition = await prisma.jobPosition.findFirst({
      where: {
        id: parseInt(jobPositionId),
        organizationId,
      },
    });

    if (!jobPosition) {
      return sendError(res, 'Job position not found', STATUS_CODES.NOT_FOUND);
    }

    // Check for duplicate application (unique constraint: candidateId + jobPositionId)
    const existingApplication = await prisma.application.findFirst({
      where: {
        candidateId: parseInt(candidateId),
        jobPositionId: parseInt(jobPositionId),
        organizationId,
      },
    });

    if (existingApplication) {
      return sendError(
        res,
        'This candidate has already applied for this job position',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        organizationId,
        candidateId: parseInt(candidateId),
        jobPositionId: parseInt(jobPositionId),
        appliedDate: appliedDate ? new Date(appliedDate) : new Date(),
        status: 'Applied',
        notes,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
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
    });

    return sendSuccess(res, { application }, 'Application created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create application error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update application
 * PUT /api/:orgSlug/recruitment/applications/:id
 */
export const updateApplication = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if application exists
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingApplication) {
      return sendError(res, 'Application not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate status if provided
    if (status && !VALID_APPLICATION_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_APPLICATION_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Update application
    const application = await prisma.application.update({
      where: { id: parseInt(id) },
      data: {
        status,
        notes,
        updatedBy: userId,
      },
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
            code: true,
          },
        },
      },
    });

    // Cascade status update to candidate if status was changed
    if (status) {
      await updateCandidateStatusFromApplications(
        application.candidateId,
        organizationId,
        userId
      );
    }

    return sendSuccess(res, { application }, 'Application updated successfully');
  } catch (error) {
    console.error('Update application error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update application status (for Kanban drag-and-drop)
 * PATCH /api/:orgSlug/recruitment/applications/:id/status
 */
export const updateApplicationStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validation
    if (!status) {
      return sendError(res, 'Status is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!VALID_APPLICATION_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_APPLICATION_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if application exists
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existingApplication) {
      return sendError(res, 'Application not found', STATUS_CODES.NOT_FOUND);
    }

    // Update status
    const application = await prisma.application.update({
      where: { id: parseInt(id) },
      data: {
        status,
        notes: notes || existingApplication.notes,
        updatedBy: userId,
      },
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
    });

    // Cascade status update to candidate
    await updateCandidateStatusFromApplications(
      application.candidateId,
      organizationId,
      userId
    );

    return sendSuccess(res, { application }, 'Application status updated successfully');
  } catch (error) {
    console.error('Update application status error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete application
 * DELETE /api/:orgSlug/recruitment/applications/:id
 */
export const deleteApplication = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if application exists
    const application = await prisma.application.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        interviewSchedules: {
          where: {
            status: 'Completed',
          },
        },
      },
    });

    if (!application) {
      return sendError(res, 'Application not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if application has completed interviews
    if (application.interviewSchedules && application.interviewSchedules.length > 0) {
      return sendError(
        res,
        `Cannot delete application. It has ${application.interviewSchedules.length} completed interview(s).`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Delete application (cascade will delete interview schedules)
    await prisma.application.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Application deleted successfully');
  } catch (error) {
    console.error('Delete application error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
