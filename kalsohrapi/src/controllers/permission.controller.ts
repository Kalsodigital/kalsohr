import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES } from '../config/constants';

const prisma = new PrismaClient();

/**
 * Get permissions for a specific role
 * GET /api/superadmin/permissions/:roleId
 */
export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!role) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    // Determine if this is a platform role (organizationId = null) or org role
    const isPlatformRole = role.organizationId === null;

    // Get appropriate modules based on role type
    let modules: any[];
    if (isPlatformRole) {
      // Platform roles get BOTH platform modules AND org modules
      // This allows support admins to have permissions for org modules when impersonating
      const [platformModules, orgModules] = await Promise.all([
        prisma.platformModule.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        }),
        prisma.orgModule.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        }),
      ]);
      // Add type field to distinguish between platform and org modules
      const platformModulesWithType = platformModules.map(m => ({ ...m, type: 'platform' }));
      const orgModulesWithType = orgModules.map(m => ({ ...m, type: 'org' }));
      modules = [...platformModulesWithType, ...orgModulesWithType];
    } else {
      // Organization roles get org modules only
      modules = await prisma.orgModule.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          displayOrder: 'asc',
        },
      });
    }

    // Get role permissions
    const permissions = await prisma.rolePermission.findMany({
      where: {
        roleId: Number(roleId),
      },
      select: {
        id: true,
        moduleCode: true,
        orgModuleId: true,
        canRead: true,
        canWrite: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
      },
    });

    // Create a map of module permissions (by moduleCode for backward compatibility)
    const permissionMap: Record<string, { canRead: boolean; canWrite: boolean; canUpdate: boolean; canDelete: boolean; canApprove: boolean; canExport: boolean }> = {};
    permissions.forEach((perm) => {
      permissionMap[perm.moduleCode] = {
        canRead: perm.canRead,
        canWrite: perm.canWrite,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
        canApprove: perm.canApprove,
        canExport: perm.canExport,
      };
    });

    // Return modules with their permissions
    const modulePermissions = modules.map((mod) => ({
      ...mod,
      permissions: permissionMap[mod.code] || {
        canRead: false,
        canWrite: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
      },
    }));

    return sendSuccess(
      res,
      {
        role,
        modules: modulePermissions,
        permissions,
        isPlatformRole,
      },
      'Role permissions fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return sendError(res, 'Failed to fetch role permissions', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update permissions for a role
 * PUT /api/superadmin/permissions/:roleId
 * Body: { permissions: [{ moduleCode, canRead, canWrite, canUpdate, canDelete, canApprove, canExport }] }
 */
export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return sendError(res, 'Permissions array is required', STATUS_CODES.BAD_REQUEST);
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) },
    });

    if (!role) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    // Block modifications to org_admin role - it always has full access
    if (role.code === 'org_admin') {
      return sendError(
        res,
        'Organization Admin role has full access by default and cannot be modified',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Delete existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: Number(roleId),
      },
    });

    // Filter permissions to only include those with at least one permission enabled
    const activePermissions = permissions.filter((perm: any) =>
      perm.canRead || perm.canWrite || perm.canUpdate ||
      perm.canDelete || perm.canApprove || perm.canExport
    );

    // Create new permissions (only for modules with at least one permission enabled)
    const createdPermissions = await Promise.all(
      activePermissions.map((perm: any) =>
        prisma.rolePermission.create({
          data: {
            roleId: Number(roleId),
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

    return sendSuccess(
      res,
      { permissions: createdPermissions },
      'Role permissions updated successfully'
    );
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return sendError(res, 'Failed to update role permissions', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Update a single permission for a role
 * PATCH /api/superadmin/permissions/:roleId/:moduleCode
 */
export const updateModulePermission = async (req: Request, res: Response) => {
  try {
    const { roleId, moduleCode } = req.params;
    const { canRead, canWrite, canUpdate, canDelete, canApprove, canExport } = req.body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) },
    });

    if (!role) {
      return sendError(res, 'Role not found', STATUS_CODES.NOT_FOUND);
    }

    // Block modifications to org_admin role - it always has full access
    if (role.code === 'org_admin') {
      return sendError(
        res,
        'Organization Admin role has full access by default and cannot be modified',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if org module exists
    const orgModule = await prisma.orgModule.findUnique({
      where: { code: moduleCode },
    });

    if (!orgModule) {
      return sendError(res, 'Module not found', STATUS_CODES.NOT_FOUND);
    }

    // Upsert permission
    const permission = await prisma.rolePermission.upsert({
      where: {
        roleId_moduleCode: {
          roleId: Number(roleId),
          moduleCode,
        },
      },
      update: {
        canRead: canRead !== undefined ? canRead : undefined,
        canWrite: canWrite !== undefined ? canWrite : undefined,
        canUpdate: canUpdate !== undefined ? canUpdate : undefined,
        canDelete: canDelete !== undefined ? canDelete : undefined,
        canApprove: canApprove !== undefined ? canApprove : undefined,
        canExport: canExport !== undefined ? canExport : undefined,
        orgModuleId: orgModule.id,
      },
      create: {
        roleId: Number(roleId),
        moduleCode,
        orgModuleId: orgModule.id,
        canRead: canRead || false,
        canWrite: canWrite || false,
        canUpdate: canUpdate || false,
        canDelete: canDelete || false,
        canApprove: canApprove || false,
        canExport: canExport || false,
      },
      include: {
        orgModule: true,
      },
    });

    return sendSuccess(res, { permission }, 'Permission updated successfully');
  } catch (error) {
    console.error('Error updating permission:', error);
    return sendError(res, 'Failed to update permission', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};
