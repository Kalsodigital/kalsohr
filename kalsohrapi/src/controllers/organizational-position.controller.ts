import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all organizational positions for the organization
 * GET /api/:orgSlug/masters/organizational-positions
 */
export const getAllOrganizationalPositions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const user = (req as any).user;
    const { isActive, departmentId, designationId } = req.query;

    const where: any = {
      organizationId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }

    if (designationId) {
      where.designationId = parseInt(designationId as string);
    }

    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const organizationalPositions = await prisma.organizationalPosition.findMany({
      where,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        code: true,
        description: true,
        departmentId: true,
        designationId: true,
        reportingPositionId: true,
        headCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
          },
        },
        reportingPosition: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
            subordinatePositions: true,
          },
        },
      },
    });

    if (canViewAudit) {
      const userIds = new Set<number>();
      organizationalPositions.forEach(item => {
        if (item.createdBy) userIds.add(item.createdBy);
        if (item.updatedBy) userIds.add(item.updatedBy);
      });

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      const itemsWithAudit = organizationalPositions.map(item => ({
        ...item,
        creator: item.createdBy ? userMap.get(item.createdBy) : null,
        updater: item.updatedBy ? userMap.get(item.updatedBy) : null,
      }));

      return sendSuccess(res, { organizationalPositions: itemsWithAudit }, 'Organizational positions retrieved successfully');
    }

    return sendSuccess(res, { organizationalPositions }, 'Organizational positions retrieved successfully');
  } catch (error) {
    console.error('Get organizational positions error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get organizational position by ID
 * GET /api/:orgSlug/masters/organizational-positions/:id
 */
export const getOrganizationalPositionById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const organizationalPosition = await prisma.organizationalPosition.findFirst({
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
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
          },
        },
        reportingPosition: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        _count: {
          select: {
            employees: true,
            subordinatePositions: true,
          },
        },
      },
    });

    if (!organizationalPosition) {
      return sendError(res, 'Organizational position not found', STATUS_CODES.NOT_FOUND);
    }

    return sendSuccess(res, { organizationalPosition }, 'Organizational position retrieved successfully');
  } catch (error) {
    console.error('Get organizational position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Helper function to check for circular reporting hierarchy
 */
const checkCircularHierarchy = async (
  positionId: number,
  reportingPositionId: number,
  organizationId: number
): Promise<boolean> => {
  let currentId: number | null = reportingPositionId;
  const visited = new Set<number>();

  while (currentId !== null) {
    // If we encounter the position we're trying to update, it's circular
    if (currentId === positionId) {
      return true;
    }

    // Prevent infinite loops
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);

    // Get the next level up
    const position: { reportingPositionId: number | null } | null = await prisma.organizationalPosition.findFirst({
      where: {
        id: currentId,
        organizationId,
      },
      select: {
        reportingPositionId: true,
      },
    });

    if (!position) {
      break;
    }

    currentId = position.reportingPositionId;
  }

  return false;
};

/**
 * Create organizational position
 * POST /api/:orgSlug/masters/organizational-positions
 */
export const createOrganizationalPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { title, code, description, departmentId, designationId, reportingPositionId, headCount, isActive } =
      req.body;

    // Validation
    if (!title) {
      return sendError(res, 'Title is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!departmentId) {
      return sendError(res, 'Department is required', STATUS_CODES.BAD_REQUEST);
    }

    if (!designationId) {
      return sendError(res, 'Designation is required', STATUS_CODES.BAD_REQUEST);
    }

    // Validate headCount
    const hc = headCount !== undefined ? headCount : 1;
    if (hc < 1) {
      return sendError(res, 'Head count must be at least 1', STATUS_CODES.BAD_REQUEST);
    }

    // Verify department exists and belongs to this organization
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

    // Verify designation exists and belongs to this organization
    const designation = await prisma.designation.findFirst({
      where: {
        id: designationId,
        organizationId,
      },
    });

    if (!designation) {
      return sendError(
        res,
        'Designation not found or does not belong to this organization',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if code already exists for this organization
    if (code) {
      const existingCode = await prisma.organizationalPosition.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (existingCode) {
        return sendError(
          res,
          'An organizational position with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Check for duplicate combination of department, designation, and title
    const existingCombo = await prisma.organizationalPosition.findUnique({
      where: {
        organizationId_departmentId_designationId_title: {
          organizationId,
          departmentId,
          designationId,
          title,
        },
      },
    });

    if (existingCombo) {
      return sendError(
        res,
        'An organizational position with this combination of department, designation, and title already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Verify reporting position exists and belongs to this organization (if provided)
    if (reportingPositionId) {
      const reportingPosition = await prisma.organizationalPosition.findFirst({
        where: {
          id: reportingPositionId,
          organizationId,
        },
      });

      if (!reportingPosition) {
        return sendError(
          res,
          'Reporting position not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    const organizationalPosition = await prisma.organizationalPosition.create({
      data: {
        title,
        code: code ? code.toUpperCase() : null,
        description: description || null,
        departmentId,
        designationId,
        reportingPositionId: reportingPositionId || null,
        headCount: hc,
        isActive: isActive !== undefined ? isActive : true,
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
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
          },
        },
        reportingPosition: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      { organizationalPosition },
      'Organizational position created successfully',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create organizational position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update organizational position
 * PUT /api/:orgSlug/masters/organizational-positions/:id
 */
export const updateOrganizationalPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const { title, code, description, departmentId, designationId, reportingPositionId, headCount, isActive } =
      req.body;

    // Check if organizational position exists and belongs to this organization
    const existing = await prisma.organizationalPosition.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
    });

    if (!existing) {
      return sendError(res, 'Organizational position not found', STATUS_CODES.NOT_FOUND);
    }

    // Validate headCount if provided
    if (headCount !== undefined && headCount < 1) {
      return sendError(res, 'Head count must be at least 1', STATUS_CODES.BAD_REQUEST);
    }

    // Verify department exists and belongs to this organization (if provided)
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

    // Verify designation exists and belongs to this organization (if provided)
    if (designationId) {
      const designation = await prisma.designation.findFirst({
        where: {
          id: designationId,
          organizationId,
        },
      });

      if (!designation) {
        return sendError(
          res,
          'Designation not found or does not belong to this organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.organizationalPosition.findFirst({
        where: {
          organizationId,
          code: code.toUpperCase(),
        },
      });

      if (duplicate) {
        return sendError(
          res,
          'An organizational position with this code already exists in your organization',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Check for duplicate combination if any of the key fields are changing
    const newTitle = title || existing.title;
    const newDeptId = departmentId || existing.departmentId;
    const newDesigId = designationId || existing.designationId;

    if (
      newTitle !== existing.title ||
      newDeptId !== existing.departmentId ||
      newDesigId !== existing.designationId
    ) {
      const existingCombo = await prisma.organizationalPosition.findUnique({
        where: {
          organizationId_departmentId_designationId_title: {
            organizationId,
            departmentId: newDeptId,
            designationId: newDesigId,
            title: newTitle,
          },
        },
      });

      if (existingCombo && existingCombo.id !== parseInt(id)) {
        return sendError(
          res,
          'An organizational position with this combination of department, designation, and title already exists',
          STATUS_CODES.BAD_REQUEST
        );
      }
    }

    // Verify reporting position and check for circular hierarchy
    if (reportingPositionId !== undefined) {
      if (reportingPositionId !== null) {
        const reportingPosition = await prisma.organizationalPosition.findFirst({
          where: {
            id: reportingPositionId,
            organizationId,
          },
        });

        if (!reportingPosition) {
          return sendError(
            res,
            'Reporting position not found or does not belong to this organization',
            STATUS_CODES.BAD_REQUEST
          );
        }

        // Check for circular hierarchy
        const isCircular = await checkCircularHierarchy(parseInt(id), reportingPositionId, organizationId);

        if (isCircular) {
          return sendError(
            res,
            'Cannot set this reporting position as it would create a circular hierarchy',
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
    }

    const organizationalPosition = await prisma.organizationalPosition.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(code !== undefined && { code: code ? code.toUpperCase() : null }),
        ...(description !== undefined && { description }),
        ...(departmentId && { departmentId }),
        ...(designationId && { designationId }),
        ...(reportingPositionId !== undefined && { reportingPositionId }),
        ...(headCount !== undefined && { headCount }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
          },
        },
        reportingPosition: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
    });

    return sendSuccess(res, { organizationalPosition }, 'Organizational position updated successfully');
  } catch (error) {
    console.error('Update organizational position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete organizational position
 * DELETE /api/:orgSlug/masters/organizational-positions/:id
 */
export const deleteOrganizationalPosition = async (req: Request, res: Response): Promise<Response> => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Check if organizational position exists and belongs to this organization
    const existing = await prisma.organizationalPosition.findFirst({
      where: {
        id: parseInt(id),
        organizationId,
      },
      include: {
        employees: true,
        subordinatePositions: true,
      },
    });

    if (!existing) {
      return sendError(res, 'Organizational position not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if organizational position has employees
    if (existing.employees.length > 0) {
      return sendError(
        res,
        `Cannot delete organizational position with ${existing.employees.length} assigned employees. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if organizational position has subordinate positions
    if (existing.subordinatePositions.length > 0) {
      return sendError(
        res,
        `Cannot delete organizational position with ${existing.subordinatePositions.length} subordinate positions. Please reassign them first.`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.organizationalPosition.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Organizational position deleted successfully');
  } catch (error) {
    console.error('Delete organizational position error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
