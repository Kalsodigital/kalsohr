import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all blood groups
 * GET /api/superadmin/masters/blood-groups
 * GET /api/:orgSlug/masters/blood-groups (read-only for orgs)
 */
export const getAllBloodGroups = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const bloodGroups = await prisma.bloodGroup.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      bloodGroups.forEach(group => {
        if (group.createdBy) userIds.add(group.createdBy);
        if (group.updatedBy) userIds.add(group.updatedBy);
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

      const bloodGroupsWithAudit = bloodGroups.map(group => ({
        ...group,
        creator: group.createdBy ? userMap.get(group.createdBy) : null,
        updater: group.updatedBy ? userMap.get(group.updatedBy) : null,
      }));

      return sendSuccess(res, { bloodGroups: bloodGroupsWithAudit }, 'Blood groups retrieved successfully');
    }

    return sendSuccess(res, { bloodGroups }, 'Blood groups retrieved successfully');
  } catch (error) {
    console.error('Get blood groups error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get blood group by ID
 * GET /api/superadmin/masters/blood-groups/:id
 */
export const getBloodGroupById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const bloodGroup = await prisma.bloodGroup.findUnique({
      where: { id: parseInt(id) },
    });

    if (!bloodGroup) {
      return sendError(res, 'Blood group not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (bloodGroup.createdBy) userIds.push(bloodGroup.createdBy);
      if (bloodGroup.updatedBy) userIds.push(bloodGroup.updatedBy);

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

      const bloodGroupWithAudit = {
        ...bloodGroup,
        creator: bloodGroup.createdBy ? userMap.get(bloodGroup.createdBy) : null,
        updater: bloodGroup.updatedBy ? userMap.get(bloodGroup.updatedBy) : null,
      };

      return sendSuccess(res, { bloodGroup: bloodGroupWithAudit }, 'Blood group retrieved successfully');
    }

    return sendSuccess(res, { bloodGroup }, 'Blood group retrieved successfully');
  } catch (error) {
    console.error('Get blood group error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new blood group
 * POST /api/superadmin/masters/blood-groups
 */
export const createBloodGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingBloodGroup = await prisma.bloodGroup.findUnique({
      where: { code },
    });

    if (existingBloodGroup) {
      return sendError(res, 'Blood group with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const bloodGroup = await prisma.bloodGroup.create({
      data: {
        name,
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { bloodGroup }, 'Blood group created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create blood group error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update blood group
 * PUT /api/superadmin/masters/blood-groups/:id
 */
export const updateBloodGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, isActive, displayOrder } = req.body;

    // Check if blood group exists
    const existingBloodGroup = await prisma.bloodGroup.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBloodGroup) {
      return sendError(res, 'Blood group not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingBloodGroup.code) {
      const duplicateBloodGroup = await prisma.bloodGroup.findUnique({
        where: { code },
      });

      if (duplicateBloodGroup) {
        return sendError(res, 'Blood group with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const bloodGroup = await prisma.bloodGroup.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingBloodGroup.name,
        code: code ? code.toUpperCase() : existingBloodGroup.code,
        isActive: isActive !== undefined ? isActive : existingBloodGroup.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingBloodGroup.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { bloodGroup }, 'Blood group updated successfully');
  } catch (error) {
    console.error('Update blood group error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete blood group
 * DELETE /api/superadmin/masters/blood-groups/:id
 */
export const deleteBloodGroup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if blood group exists
    const existingBloodGroup = await prisma.bloodGroup.findUnique({
      where: { id: parseInt(id) },
      include: { employees: true },
    });

    if (!existingBloodGroup) {
      return sendError(res, 'Blood group not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if blood group is being used by any employees
    if (existingBloodGroup.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete blood group. It is being used by ${existingBloodGroup.employees.length} employee(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.bloodGroup.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Blood group deleted successfully');
  } catch (error) {
    console.error('Delete blood group error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
