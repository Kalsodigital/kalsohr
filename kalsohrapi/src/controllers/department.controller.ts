import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all departments for the organization
 * GET /api/:orgSlug/masters/departments
 */
export const getAllDepartments = async (req: Request, res: Response): Promise<Response> => {
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

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        headEmployeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        headEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            employees: true,
            jobPositions: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      // Fetch creator and updater details for all departments
      const userIds = new Set<number>();
      departments.forEach(dept => {
        if (dept.createdBy) userIds.add(dept.createdBy);
        if (dept.updatedBy) userIds.add(dept.updatedBy);
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

      // Attach creator and updater details to each department
      const departmentsWithAudit = departments.map(dept => ({
        ...dept,
        creator: dept.createdBy ? userMap.get(dept.createdBy) : null,
        updater: dept.updatedBy ? userMap.get(dept.updatedBy) : null,
      }));

      return sendSuccess(res, { departments: departmentsWithAudit }, 'Departments retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { departments }, 'Departments retrieved successfully');
  } catch (error) {
    console.error('Get departments error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get department by ID
 * GET /api/:orgSlug/masters/departments/:id
 */
export const getDepartmentById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { id } = req.params;

    const department = await prisma.department.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        headEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!department) {
      return sendError(res, 'Department not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      // Fetch creator and updater details
      const userIds: number[] = [];
      if (department.createdBy) userIds.push(department.createdBy);
      if (department.updatedBy) userIds.push(department.updatedBy);

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

      const departmentWithAudit = {
        ...department,
        creator: department.createdBy ? userMap.get(department.createdBy) : null,
        updater: department.updatedBy ? userMap.get(department.updatedBy) : null,
      };

      return sendSuccess(res, { department: departmentWithAudit }, 'Department retrieved successfully');
    }

    // User doesn't have permission - return without audit info
    return sendSuccess(res, { department }, 'Department retrieved successfully');
  } catch (error) {
    console.error('Get department error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create department
 * POST /api/:orgSlug/masters/departments
 */
export const createDepartment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { name, code, description, headEmployeeId, isActive } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Name is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if code already exists for this organization
    if (code) {
      const existing = await prisma.department.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existing) {
        return sendError(
          res,
          'Department with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Verify head employee exists and belongs to this organization (if provided)
    if (headEmployeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: headEmployeeId,
          organizationId,
        },
      });

      if (!employee) {
        return sendError(
          res,
          'Head employee not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code ? code.toUpperCase() : null,
        description,
        headEmployeeId: headEmployeeId || null,
        organizationId,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        headEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sendSuccess(res, { department }, 'Department created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create department error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update department
 * PUT /api/:orgSlug/masters/departments/:id
 */
export const updateDepartment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, headEmployeeId, isActive } = req.body;

    // Check if department exists and belongs to this organization
    const existing = await prisma.department.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Department not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.department.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'Department with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Verify head employee exists and belongs to this organization (if provided)
    if (headEmployeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: headEmployeeId,
          organizationId,
        },
      });

      if (!employee) {
        return sendError(
          res,
          'Head employee not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(headEmployeeId !== undefined && { headEmployeeId }),
        ...(isActive !== undefined && { isActive }),
        updatedBy: userId,
      },
      include: {
        headEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sendSuccess(res, { department }, 'Department updated successfully');
  } catch (error) {
    console.error('Update department error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete department
 * DELETE /api/:orgSlug/masters/departments/:id
 */
export const deleteDepartment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if department exists and belongs to this organization
    const existing = await prisma.department.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        employees: true,
        jobPositions: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Department not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if department has employees
    if (existing.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete department with ${existing.employees.length} existing employees. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if department has job positions
    if (existing.jobPositions.length > 0) {
      return sendError(
        res,
        `Cannot delete department with ${existing.jobPositions.length} existing job positions. Please delete them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.department.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Department deleted successfully');
  } catch (error) {
    console.error('Delete department error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
