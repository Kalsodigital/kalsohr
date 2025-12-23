import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all branches for the organization
 * GET /api/:orgSlug/masters/branches
 */
export const getAllBranches = async (req: Request, res: Response): Promise<Response> => {
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

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        phone: true,
        email: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            employees: true,
            attendance: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      branches.forEach(item => {
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

      const branchesWithAudit = branches.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { branches: branchesWithAudit }, 'Branches retrieved successfully');
    }

    return sendSuccess(res, { branches }, 'Branches retrieved successfully');
  } catch (error) {
    console.error('Get branches error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get branch by ID
 * GET /api/:orgSlug/masters/branches/:id
 */
export const getBranchById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const branch = await prisma.branch.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!branch) {
      return sendError(res, 'Branch not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (branch.createdBy) userIds.push(branch.createdBy);
      if (branch.updatedBy) userIds.push(branch.updatedBy);

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

      const branchWithAudit = {
        ...branch,
        creator: branch.createdBy ? userMap.get(branch.createdBy) : null,
        updater: branch.updatedBy ? userMap.get(branch.updatedBy) : null,
      };

      return sendSuccess(res, { branch: branchWithAudit }, 'Branch retrieved successfully');
    }

    return sendSuccess(res, { branch }, 'Branch retrieved successfully');
  } catch (error) {
    console.error('Get branch error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create branch
 * POST /api/:orgSlug/masters/branches
 */
export const createBranch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { name, code, address, city, state, country, postalCode, phone, email, managerId, isActive } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    // Email validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Phone validation (if provided)
    if (phone) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        return sendError(res, 'Invalid phone format', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Postal code length validation
    if (postalCode && postalCode.length > 20) {
      return sendError(res, 'Postal code is too long', STATUS_CODES.BAD_REQUEST);
    }

    // Check if code already exists for this organization
    if (code) {
      const existing = await prisma.branch.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existing) {
        return sendError(
          res,
          'Branch with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Verify manager exists and belongs to this organization (if provided)
    if (managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: managerId,
          organizationId,
        },
      });

      if (!manager) {
        return sendError(
          res,
          'Manager not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        address,
        city,
        state,
        country: country || 'India',
        postalCode,
        phone,
        email,
        managerId: managerId || null,
        organizationId,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sendSuccess(res, { branch }, 'Branch created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create branch error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update branch
 * PUT /api/:orgSlug/masters/branches/:id
 */
export const updateBranch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, address, city, state, country, postalCode, phone, email, managerId, isActive } = req.body;

    // Check if branch exists and belongs to this organization
    const existing = await prisma.branch.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Branch not found', STATUS_CODES.NOT_FOUND);
    }

    // Email validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendError(res, 'Invalid email format', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Phone validation (if provided)
    if (phone) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        return sendError(res, 'Invalid phone format', STATUS_CODES.BAD_REQUEST);
      }
    }

    // Postal code length validation
    if (postalCode && postalCode.length > 20) {
      return sendError(res, 'Postal code is too long', STATUS_CODES.BAD_REQUEST);
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'Branch with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Verify manager exists and belongs to this organization (if provided)
    if (managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: managerId,
          organizationId,
        },
      });

      if (!manager) {
        return sendError(
          res,
          'Manager not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(postalCode !== undefined && { postalCode }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sendSuccess(res, { branch }, 'Branch updated successfully');
  } catch (error) {
    console.error('Update branch error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete branch
 * DELETE /api/:orgSlug/masters/branches/:id
 */
export const deleteBranch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if branch exists and belongs to this organization
    const existing = await prisma.branch.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        employees: true,
        attendance: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Branch not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if branch has employees
    if (existing.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete branch with ${existing.employees.length} existing employees. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if branch has attendance records
    if (existing.attendance.length > 0) {
      return sendError(
        res,
        `Cannot delete branch with ${existing.attendance.length} existing attendance records.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.branch.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Branch deleted successfully');
  } catch (error) {
    console.error('Delete branch error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
