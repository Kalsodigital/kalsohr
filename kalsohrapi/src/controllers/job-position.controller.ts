import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const VALID_STATUSES = ['Open', 'On Hold', 'Filled', 'Closed'];

/**
 * Get all job positions for the organization
 * GET /api/:orgSlug/masters/job-positions?status=Open&departmentId=1&priority=High
 */
export const getAllJobPositions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { status, departmentId, priority } = req.query;

    const where: any = {
      organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }

    if (priority) {
      where.priority = priority;
    }

    const jobPositions = await prisma.jobPosition.findMany({
      where,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        code: true,
        description: true,
        departmentId: true,
        requiredSkills: true,
        requiredQualifications: true,
        minExperience: true,
        maxExperience: true,
        vacancies: true,
        priority: true,
        status: true,
        postedDate: true,
        closingDate: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return sendSuccess(res, { jobPositions }, 'Job positions retrieved successfully');
  } catch (error) {
    console.error('Get job positions error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get job position by ID
 * GET /api/:orgSlug/masters/job-positions/:id
 */
export const getJobPositionById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const jobPosition = await prisma.jobPosition.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!jobPosition) {
      return sendError(res, 'Job position not found', STATUS_CODES.NOT_FOUND);
    }

    return sendSuccess(res, { jobPosition }, 'Job position retrieved successfully');
  } catch (error) {
    console.error('Get job position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create job position
 * POST /api/:orgSlug/masters/job-positions
 */
export const createJobPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const {
      title,
      code,
      description,
      departmentId,
      requiredSkills,
      requiredQualifications,
      minExperience,
      maxExperience,
      vacancies,
      priority,
      status,
      postedDate,
      closingDate,
    } = req.body;

    // Validation
    if (!title) {
      return sendError(res, 'Title is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return sendError(
        res,
        `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate experience range
    const minExp = minExperience !== undefined ? minExperience : 0;
    if (minExp < 0) {
      return sendError(res, 'Minimum experience cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    if (maxExperience !== undefined && maxExperience < minExp) {
      return sendError(
        res,
        'Maximum experience must be greater than or equal to minimum experience',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate vacancies
    const vac = vacancies !== undefined ? vacancies : 1;
    if (vac < 1) {
      return sendError(res, 'Vacancies must be at least 1', STATUS_CODES.BAD_REQUEST);
    }

    // Validate department if provided
    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId,
        },
      });

      if (!department) {
        return sendError(
          res,
          'Department not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate dates
    if (postedDate && closingDate) {
      const posted = new Date(postedDate);
      const closing = new Date(closingDate);
      if (closing < posted) {
        return sendError(
          res,
          'Closing date must be after or equal to posted date',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const jobPosition = await prisma.jobPosition.create({
      data: {
        title,
        code: code || null,
        description: description || null,
        departmentId: departmentId || null,
        requiredSkills: requiredSkills || null,
        requiredQualifications: requiredQualifications || null,
        minExperience: minExp,
        maxExperience: maxExperience || null,
        vacancies: vac,
        priority: priority || 'Medium',
        status: status || 'Open',
        postedDate: postedDate ? new Date(postedDate) : new Date(),
        closingDate: closingDate ? new Date(closingDate) : null,
        organizationId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(res, { jobPosition }, 'Job position created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create job position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update job position
 * PUT /api/:orgSlug/masters/job-positions/:id
 */
export const updateJobPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const {
      title,
      code,
      description,
      departmentId,
      requiredSkills,
      requiredQualifications,
      minExperience,
      maxExperience,
      vacancies,
      priority,
      status,
      postedDate,
      closingDate,
    } = req.body;

    // Check if job position exists and belongs to this organization
    const existing = await prisma.jobPosition.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Job position not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return sendError(
        res,
        `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(
        res,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate experience range
    if (minExperience !== undefined && minExperience < 0) {
      return sendError(res, 'Minimum experience cannot be negative', STATUS_CODES.BAD_REQUEST);
    }

    const minExp = minExperience !== undefined ? minExperience : existing.minExperience;
    const maxExp = maxExperience !== undefined ? maxExperience : existing.maxExperience;

    if (maxExp !== null && maxExp < minExp) {
      return sendError(
        res,
        'Maximum experience must be greater than or equal to minimum experience',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate vacancies
    if (vacancies !== undefined && vacancies < 1) {
      return sendError(res, 'Vacancies must be at least 1', STATUS_CODES.BAD_REQUEST);
    }

    // Validate department if provided
    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId,
        },
      });

      if (!department) {
        return sendError(
          res,
          'Department not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Validate dates
    const posted = postedDate ? new Date(postedDate) : existing.postedDate;
    const closing = closingDate ? new Date(closingDate) : existing.closingDate;

    if (posted && closing && closing < posted) {
      return sendError(
        res,
        'Closing date must be after or equal to posted date',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const jobPosition = await prisma.jobPosition.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(departmentId !== undefined && { departmentId }),
        ...(requiredSkills !== undefined && { requiredSkills }),
        ...(requiredQualifications !== undefined && { requiredQualifications }),
        ...(minExperience !== undefined && { minExperience }),
        ...(maxExperience !== undefined && { maxExperience }),
        ...(vacancies !== undefined && { vacancies }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(postedDate && { postedDate: new Date(postedDate) }),
        ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(res, { jobPosition }, 'Job position updated successfully');
  } catch (error) {
    console.error('Update job position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete job position
 * DELETE /api/:orgSlug/masters/job-positions/:id
 */
export const deleteJobPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if job position exists and belongs to this organization
    const existing = await prisma.jobPosition.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        applications: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Job position not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if job position has applications
    if (existing.applications.length > 0) {
      return sendError(
        res,
        `Cannot delete job position with ${existing.applications.length} existing applications. Consider marking it as 'Closed' instead.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.jobPosition.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Job position deleted successfully');
  } catch (error) {
    console.error('Delete job position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
