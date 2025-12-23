import { Request, Response } from 'express';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all organization types
 * GET /api/superadmin/masters/organization-types
 * GET /api/:orgSlug/masters/organization-types (read-only for orgs)
 */
export const getAllOrganizationTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    const organizationTypes = await prisma.organizationType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
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
      organizationTypes.forEach(type => {
        if (type.createdBy) userIds.add(type.createdBy);
        if (type.updatedBy) userIds.add(type.updatedBy);
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

      const organizationTypesWithAudit = organizationTypes.map(type => ({
        ...type,
        creator: type.createdBy ? userMap.get(type.createdBy) : null,
        updater: type.updatedBy ? userMap.get(type.updatedBy) : null,
      }));

      return sendSuccess(res, { organizationTypes: organizationTypesWithAudit }, 'Organization types retrieved successfully');
    }

    return sendSuccess(res, { organizationTypes }, 'Organization types retrieved successfully');
  } catch (error) {
    console.error('Get organization types error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Get organization type by ID
 * GET /api/superadmin/masters/organization-types/:id
 */
export const getOrganizationTypeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const organizationType = await prisma.organizationType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!organizationType) {
      return sendError(res, 'Organization type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'master_data');

    if (canViewAudit) {
      const userIds: number[] = [];
      if (organizationType.createdBy) userIds.push(organizationType.createdBy);
      if (organizationType.updatedBy) userIds.push(organizationType.updatedBy);

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

      const organizationTypeWithAudit = {
        ...organizationType,
        creator: organizationType.createdBy ? userMap.get(organizationType.createdBy) : null,
        updater: organizationType.updatedBy ? userMap.get(organizationType.updatedBy) : null,
      };

      return sendSuccess(res, { organizationType: organizationTypeWithAudit }, 'Organization type retrieved successfully');
    }

    return sendSuccess(res, { organizationType }, 'Organization type retrieved successfully');
  } catch (error) {
    console.error('Get organization type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Create new organization type
 * POST /api/superadmin/masters/organization-types
 */
export const createOrganizationType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, description, isActive, displayOrder } = req.body;

    // Validation
    if (!name || !code) {
      return sendError(res, 'Name and code are required', STATUS_CODES.BAD_REQUEST);
    }

    // Check for duplicate code
    const existingOrganizationType = await prisma.organizationType.findUnique({
      where: { code },
    });

    if (existingOrganizationType) {
      return sendError(res, 'Organization type with this code already exists', STATUS_CODES.BAD_REQUEST);
    }

    const organizationType = await prisma.organizationType.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { organizationType }, 'Organization type created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Create organization type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Update organization type
 * PUT /api/superadmin/masters/organization-types/:id
 */
export const updateOrganizationType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, isActive, displayOrder } = req.body;

    // Check if organization type exists
    const existingOrganizationType = await prisma.organizationType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingOrganizationType) {
      return sendError(res, 'Organization type not found', STATUS_CODES.NOT_FOUND);
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingOrganizationType.code) {
      const duplicateOrganizationType = await prisma.organizationType.findUnique({
        where: { code },
      });

      if (duplicateOrganizationType) {
        return sendError(res, 'Organization type with this code already exists', STATUS_CODES.BAD_REQUEST);
      }
    }

    const organizationType = await prisma.organizationType.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingOrganizationType.name,
        code: code ? code.toUpperCase() : existingOrganizationType.code,
        description: description !== undefined ? description : existingOrganizationType.description,
        isActive: isActive !== undefined ? isActive : existingOrganizationType.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existingOrganizationType.displayOrder,
        updatedBy: userId,
      },
    });

    return sendSuccess(res, { organizationType }, 'Organization type updated successfully');
  } catch (error) {
    console.error('Update organization type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * Delete organization type
 * DELETE /api/superadmin/masters/organization-types/:id
 */
export const deleteOrganizationType = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if organization type exists
    const existingOrganizationType = await prisma.organizationType.findUnique({
      where: { id: parseInt(id) },
      include: { organizations: true },
    });

    if (!existingOrganizationType) {
      return sendError(res, 'Organization type not found', STATUS_CODES.NOT_FOUND);
    }

    // Check if organization type is being used by any organizations
    if (existingOrganizationType.organizations.length > 0) {
      return sendError(
        res,
        `Cannot delete organization type. It is being used by ${existingOrganizationType.organizations.length} organization(s)`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    await prisma.organizationType.delete({
      where: { id: parseInt(id) },
    });

    return sendSuccess(res, null, 'Organization type deleted successfully');
  } catch (error) {
    console.error('Delete organization type error:', error);
    return sendError(res, MESSAGES.GENERAL.ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR, error);
  }
};
