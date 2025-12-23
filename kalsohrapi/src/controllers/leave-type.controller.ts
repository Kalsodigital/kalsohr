import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all leave types for the organization
 * GET /api/:orgSlug/masters/leave-types
 */
export const getAllLeaveTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { isActive } = req.query;

    const where: any = {
      organizationId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const leaveTypes = await prisma.leaveType.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        daysPerYear: true,
        isPaid: true,
        requiresApproval: true,
        maxConsecutiveDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        _count: {
          select: {
            leaveBalances: true,
            leaveRequests: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      leaveTypes.forEach(item => {
        if (item.createdBy) userIds.add(item.createdBy);
        if (item.updatedBy) userIds.add(item.updatedBy);
      });

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

      const leaveTypesWithAudit = leaveTypes.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { leaveTypes: leaveTypesWithAudit }, 'Leave types retrieved successfully');
    }

    return sendSuccess(res, { leaveTypes }, 'Leave types retrieved successfully');
  } catch (error) {
    console.error('Get leave types error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get leave type by ID
 * GET /api/:orgSlug/masters/leave-types/:id
 */
export const getLeaveTypeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!leaveType) {
      return sendError(res, 'Leave type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (leaveType.createdBy) userIds.push(leaveType.createdBy);
      if (leaveType.updatedBy) userIds.push(leaveType.updatedBy);

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

      const leaveTypeWithAudit = {
        ...leaveType,
        creator: leaveType.createdBy ? userMap.get(leaveType.createdBy) : null,
        updater: leaveType.updatedBy ? userMap.get(leaveType.updatedBy) : null,
      };

      return sendSuccess(res, { leaveType: leaveTypeWithAudit }, 'Leave type retrieved successfully');
    }

    return sendSuccess(res, { leaveType }, 'Leave type retrieved successfully');
  } catch (error) {
    console.error('Get leave type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create leave type
 * POST /api/:orgSlug/masters/leave-types
 */
export const createLeaveType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { name, code, description, daysPerYear, isPaid, requiresApproval, maxConsecutiveDays, isActive } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    // Days per year validation
    if (daysPerYear === undefined || daysPerYear === null) {
      return sendError(res, 'Days per year is required', STATUS_CODES.BAD_REQUEST);
    }

    if (typeof daysPerYear !== 'number' || daysPerYear < 0 || daysPerYear > 365) {
      return sendError(
        res,
        'Days per year must be a number between 0 and 365',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Max consecutive days validation
    if (maxConsecutiveDays !== undefined && maxConsecutiveDays !== null) {
      if (typeof maxConsecutiveDays !== 'number' || maxConsecutiveDays < 1) {
        return sendError(
          res,
          'Max consecutive days must be at least 1',
          STATUS_CODES.BAD_REQUEST
        );
      }

      if (maxConsecutiveDays > daysPerYear) {
        return sendError(
          res,
          'Max consecutive days cannot exceed total days per year',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Check if code already exists for this organization
    if (code) {
      const existing = await prisma.leaveType.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existing) {
        return sendError(
          res,
          'Leave type with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        description,
        daysPerYear,
        isPaid: isPaid !== undefined ? isPaid : true,
        requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
        maxConsecutiveDays: maxConsecutiveDays || null,
        organizationId,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { leaveType }, 'Leave type created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create leave type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update leave type
 * PUT /api/:orgSlug/masters/leave-types/:id
 */
export const updateLeaveType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, daysPerYear, isPaid, requiresApproval, maxConsecutiveDays, isActive } = req.body;

    // Check if leave type exists and belongs to this organization
    const existing = await prisma.leaveType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Leave type not found', STATUS_CODES.NOT_FOUND);
    }

    // Days per year validation (if provided)
    if (daysPerYear !== undefined && daysPerYear !== null) {
      if (typeof daysPerYear !== 'number' || daysPerYear < 0 || daysPerYear > 365) {
        return sendError(
          res,
          'Days per year must be a number between 0 and 365',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Max consecutive days validation (if provided)
    if (maxConsecutiveDays !== undefined && maxConsecutiveDays !== null) {
      if (typeof maxConsecutiveDays !== 'number' || maxConsecutiveDays < 1) {
        return sendError(
          res,
          'Max consecutive days must be at least 1',
          STATUS_CODES.BAD_REQUEST
        );
      }

      const finalDaysPerYear = daysPerYear !== undefined ? daysPerYear : existing.daysPerYear;
      if (maxConsecutiveDays > finalDaysPerYear) {
        return sendError(
          res,
          'Max consecutive days cannot exceed total days per year',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.leaveType.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'Leave type with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(daysPerYear !== undefined && { daysPerYear }),
        ...(isPaid !== undefined && { isPaid }),
        ...(requiresApproval !== undefined && { requiresApproval }),
        ...(maxConsecutiveDays !== undefined && { maxConsecutiveDays }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { leaveType }, 'Leave type updated successfully');
  } catch (error) {
    console.error('Update leave type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete leave type
 * DELETE /api/:orgSlug/masters/leave-types/:id
 */
export const deleteLeaveType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if leave type exists and belongs to this organization
    const existing = await prisma.leaveType.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        leaveBalances: true,
        leaveRequests: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Leave type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if leave type has leave balances
    if (existing.leaveBalances.length > 0) {
      return sendError(
        res,
        `Cannot delete leave type with ${existing.leaveBalances.length} existing leave balances. Please delete them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if leave type has leave requests
    if (existing.leaveRequests.length > 0) {
      return sendError(
        res,
        `Cannot delete leave type with ${existing.leaveRequests.length} existing leave requests. Please delete them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.leaveType.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Leave type deleted successfully');
  } catch (error) {
    console.error('Delete leave type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
