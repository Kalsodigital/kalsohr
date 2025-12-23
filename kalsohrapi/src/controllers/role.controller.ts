import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

const prisma = new PrismaClient();

/**
 * Get all platform-level roles (organizationId = NULL)
 * GET /api/superadmin/platform-roles
 */
export const getPlatformRoles = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'platform_roles');

    const roles = await prisma.role.findMany({
      where: {
        organizationId: null, // Platform-level roles
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        organizationId: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      roles.forEach(role => {
        if (role.createdBy) userIds.add(role.createdBy);
        if (role.updatedBy) userIds.add(role.updatedBy);
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

      const rolesWithAudit = roles.map(role => ({
        ...role,
        creator: role.createdBy ? userMap.get(role.createdBy) : null,
        updater: role.updatedBy ? userMap.get(role.updatedBy) : null,
      }));

      return sendSuccess(res, { roles: rolesWithAudit }, 'Platform roles fetched successfully');
    }

    return sendSuccess(res, { roles }, 'Platform roles fetched successfully');
  } catch (error) {
    console.error('Error fetching platform roles:', error);
    return sendError(res, 'Failed to fetch platform roles', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get roles for a specific organization
 * GET /api/superadmin/org-roles?organizationId={id}
 */
export const getOrganizationRoles = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return sendError(res, 'Organization ID is required', STATUS_CODES.BAD_REQUEST);
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: Number(organizationId) },
    });

    if (!organization) {
      return sendError(res, 'Organization not found', STATUS_CODES.NOT_FOUND);
    }

    const roles = await prisma.role.findMany({
      where: {
        organizationId: Number(organizationId),
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    return sendSuccess(res, { roles }, 'Organization roles fetched successfully');
  } catch (error) {
    console.error('Error fetching organization roles:', error);
    return sendError(res, 'Failed to fetch organization roles', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get all roles with optional organization filter
 * GET /api/superadmin/roles?organizationId={id}
 * Also used by tenant routes where organizationId comes from req.organizationId
 */
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const user = (req as any).user;

    // Get organizationId from query param OR from tenant context (req.organizationId)
    const organizationId = req.query.organizationId || (req as any).organizationId;

    const where: any = {};

    // If organizationId provided, filter by it
    if (organizationId) {
      where.organizationId = Number(organizationId);
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'platform_roles');

    const skip = (Number(page) - 1) * Number(limit);

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          organizationId: true,
          isSystem: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: canViewAudit,
          updatedBy: canViewAudit,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              users: true,
              permissions: true,
            },
          },
        },
      }),
      prisma.role.count({ where }),
    ]);

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      roles.forEach(role => {
        if (role.createdBy) userIds.add(role.createdBy);
        if (role.updatedBy) userIds.add(role.updatedBy);
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

      const rolesWithAudit = roles.map(role => ({
        ...role,
        creator: role.createdBy ? userMap.get(role.createdBy) : null,
        updater: role.updatedBy ? userMap.get(role.updatedBy) : null,
      }));

      return sendSuccess(
        res,
        {
          roles: rolesWithAudit,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        'Roles fetched successfully'
      );
    }

    return sendSuccess(
      res,
      {
        roles,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      'Roles fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching roles:', error);
    return sendError(res, 'Failed to fetch roles', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Get role by ID with permissions
 * GET /api/superadmin/roles/:id
 */
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        permissions: {
          select: {
            id: true,
            moduleCode: true,
            canRead: true,
            canWrite: true,
            canUpdate: true,
            canDelete: true,
            canApprove: true,
            canExport: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    return sendSuccess(res, { role }, 'Role fetched successfully');
  } catch (error) {
    console.error('Error fetching role:', error);
    return sendError(res, 'Failed to fetch role', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Create a new role (platform or organization-level)
 * POST /api/superadmin/roles
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { name, code, description, organizationId, permissions } = req.body;

    // Validation
    if (!name) {
      return sendError(res, 'Role name is required', STATUS_CODES.BAD_REQUEST);
    }

    // If organizationId provided, verify organization exists
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: Number(organizationId) },
      });

      if (!organization) {
        return sendError(res, 'Organization not found', STATUS_CODES.NOT_FOUND);
      }
    }

    // Check if role code already exists for this organization (or platform-level)
    if (code) {
      const existingRole = await prisma.role.findFirst({
        where: {
          code,
          organizationId: organizationId ? Number(organizationId) : null,
        },
      });

      if (existingRole) {
        return sendError(
          res,
          organizationId
            ? 'Role code already exists for this organization'
            : 'Platform role code already exists',
          STATUS_CODES.CONFLICT
        );
      }
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        code: code || undefined,
        description: description || undefined,
        organizationId: organizationId ? Number(organizationId) : null,
        isSystem: false,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Create permissions if provided
    if (permissions && Array.isArray(permissions)) {
      await Promise.all(
        permissions.map((perm: any) =>
          prisma.rolePermission.create({
            data: {
              roleId: role.id,
              moduleCode: perm.moduleCode,
              canRead: perm.canRead || false,
              canWrite: perm.canWrite || false,
              canUpdate: perm.canUpdate || false,
              canDelete: perm.canDelete || false,
              canApprove: perm.canApprove || false,
              canExport: perm.canExport || false,
            },
          })
        )
      );
    }

    return sendSuccess(res, { role }, 'Role created successfully', STATUS_CODES.CREATED);
  } catch (error) {
    console.error('Error creating role:', error);
    return sendError(res, 'Failed to create role', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update role
 * PUT /api/superadmin/roles/:id
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: Number(id) },
    });

    if (!existingRole) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    // Cannot modify system roles
    if (existingRole.isSystem) {
      return sendError(res, 'Cannot modify system roles', STATUS_CODES.FORBIDDEN);
    }

    // Update role
    const role = await prisma.role.update({
      where: { id: Number(id) },
      data: {
        name: name || existingRole.name,
        code: code || existingRole.code,
        description: description !== undefined ? description : existingRole.description,
        isActive: isActive !== undefined ? isActive : existingRole.isActive,
        updatedBy: userId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return sendSuccess(res, { role }, 'Role updated successfully');
  } catch (error) {
    console.error('Error updating role:', error);
    return sendError(res, 'Failed to update role', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Delete role
 * DELETE /api/superadmin/roles/:id
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    // Cannot delete system roles
    if (role.isSystem) {
      return sendError(res, 'Cannot delete system roles', STATUS_CODES.FORBIDDEN);
    }

    // Cannot delete role if users are assigned to it
    if (role._count.users > 0) {
      return sendError(
        res,
        `Cannot delete role. ${role._count.users} user(s) are assigned to this role`,
        STATUS_CODES.CONFLICT
      );
    }

    // Delete role and associated permissions (cascade)
    await prisma.role.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(res, null, 'Role deleted successfully');
  } catch (error) {
    console.error('Error deleting role:', error);
    return sendError(res, 'Failed to delete role', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};
