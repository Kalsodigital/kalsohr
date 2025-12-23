import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendError } from '../utils/response';
import { STATUS_CODES } from '../config/constants';

const prisma = new PrismaClient();

export type PermissionAction = 'canRead' | 'canWrite' | 'canUpdate' | 'canDelete' | 'canApprove' | 'canExport';

/**
 * Middleware to check if user has required permission for a module
 * Usage: checkPermission('organizations', 'canWrite')
 */
export const checkPermission = (moduleCode: string, action: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return sendError(res, 'Unauthorized', STATUS_CODES.UNAUTHORIZED);
      }

      // Super admins WITHOUT a role have full access
      if (user.isSuperAdmin && !user.roleId) {
        return next();
      }

      // If user has no role, deny access
      if (!user.roleId) {
        return sendError(
          res,
          'You do not have permission to perform this action',
          STATUS_CODES.FORBIDDEN
        );
      }

      // Check if user has the required permission
      const permission = await prisma.rolePermission.findUnique({
        where: {
          roleId_moduleCode: {
            roleId: user.roleId,
            moduleCode,
          },
        },
      });

      if (!permission || !permission[action]) {
        return sendError(
          res,
          'You do not have permission to perform this action',
          STATUS_CODES.FORBIDDEN
        );
      }

      // User has permission, proceed
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return sendError(res, 'Permission check failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  };
};

/**
 * Middleware to check if user has ANY permission for a module (read, write, update, delete, approve, or export)
 */
export const checkAnyPermission = (moduleCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return sendError(res, 'Unauthorized', STATUS_CODES.UNAUTHORIZED);
      }

      // Super admins WITHOUT a role have full access
      if (user.isSuperAdmin && !user.roleId) {
        return next();
      }

      // If user has no role, deny access
      if (!user.roleId) {
        return sendError(
          res,
          'You do not have permission to access this resource',
          STATUS_CODES.FORBIDDEN
        );
      }

      // Check if user has any permission for this module
      const permission = await prisma.rolePermission.findUnique({
        where: {
          roleId_moduleCode: {
            roleId: user.roleId,
            moduleCode,
          },
        },
      });

      if (!permission) {
        return sendError(
          res,
          'You do not have permission to access this resource',
          STATUS_CODES.FORBIDDEN
        );
      }

      // Check if user has at least one permission
      const hasAnyPermission =
        permission.canRead ||
        permission.canWrite ||
        permission.canUpdate ||
        permission.canDelete ||
        permission.canApprove ||
        permission.canExport;

      if (!hasAnyPermission) {
        return sendError(
          res,
          'You do not have permission to access this resource',
          STATUS_CODES.FORBIDDEN
        );
      }

      // User has at least one permission, proceed
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return sendError(res, 'Permission check failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  };
};

/**
 * Organization-scoped permission check
 * For use in tenant routes (/:orgSlug/*)
 * Validates both module enablement and user permissions
 */
export const checkOrgPermission = (moduleCode: string, action: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const organizationId = (req as any).organizationId;

      if (!user) {
        sendError(res, 'Unauthorized', STATUS_CODES.UNAUTHORIZED);
        return;
      }

      if (!organizationId) {
        sendError(
          res,
          'Organization context is required',
          STATUS_CODES.BAD_REQUEST
        );
        return;
      }

      // Super admins in support mode (impersonating) - check platform role permissions
      // Check is done by tenantContext middleware which sets req.isImpersonating
      const isImpersonating = (req as any).isImpersonating;

      if (user.isSuperAdmin && isImpersonating) {
        // Block delete and export operations for safety
        if (action === 'canDelete' || action === 'canExport') {
          sendError(
            res,
            'Delete and export operations are restricted in support mode',
            STATUS_CODES.FORBIDDEN
          );
          return;
        }

        // Use the super admin's own platform role permissions for organization modules
        if (user.roleId) {
          const permission = await prisma.rolePermission.findUnique({
            where: {
              roleId_moduleCode: {
                roleId: user.roleId,
                moduleCode,
              },
            },
          });

          if (!permission || !permission[action]) {
            sendError(
              res,
              'You do not have permission to perform this action',
              STATUS_CODES.FORBIDDEN
            );
            return;
          }

          // Platform role has permission for this organization module, proceed
          next();
          return;
        }

        // No platform role, grant full access (backwards compatibility)
        next();
        return;
      }

      // Block super admins who are NOT impersonating (safety check)
      if (user.isSuperAdmin && !isImpersonating) {
        sendError(
          res,
          'Super admins cannot access organization routes',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // User must have a role
      if (!user.roleId) {
        sendError(
          res,
          'You do not have a role assigned',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // First, find the org module by code
      const moduleRecord = await prisma.orgModule.findUnique({
        where: { code: moduleCode },
      });

      if (!moduleRecord) {
        sendError(
          res,
          `Module ${moduleCode} not found`,
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // Check if module is enabled for this organization
      const orgModuleEnabled = await prisma.organizationModule.findUnique({
        where: {
          organizationId_orgModuleId: {
            organizationId,
            orgModuleId: moduleRecord.id,
          },
        },
      });

      if (!orgModuleEnabled || !orgModuleEnabled.isEnabled) {
        sendError(
          res,
          `The ${moduleCode} module is not enabled for your organization`,
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // Check if user's role has the required permission
      const permission = await prisma.rolePermission.findUnique({
        where: {
          roleId_moduleCode: {
            roleId: user.roleId,
            moduleCode,
          },
        },
      });

      if (!permission || !permission[action]) {
        sendError(
          res,
          'You do not have permission to perform this action',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // User has permission, proceed
      next();
    } catch (error) {
      console.error('Org permission check error:', error);
      sendError(res, 'Permission check failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  };
};

/**
 * Organization-scoped ANY permission check
 * Checks if user has at least one permission for the module
 */
export const checkAnyOrgPermission = (moduleCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const organizationId = (req as any).organizationId;

      if (!user) {
        sendError(res, 'Unauthorized', STATUS_CODES.UNAUTHORIZED);
        return;
      }

      if (!organizationId) {
        sendError(
          res,
          'Organization context is required',
          STATUS_CODES.BAD_REQUEST
        );
        return;
      }

      // Super admins in support mode (impersonating) - check platform role permissions
      // Check is done by tenantContext middleware which sets req.isImpersonating
      const isImpersonating = (req as any).isImpersonating;

      if (user.isSuperAdmin && isImpersonating) {
        // Use the super admin's own platform role permissions for organization modules
        if (user.roleId) {
          const permission = await prisma.rolePermission.findUnique({
            where: {
              roleId_moduleCode: {
                roleId: user.roleId,
                moduleCode,
              },
            },
          });

          if (!permission) {
            sendError(
              res,
              'You do not have permission to access this resource',
              STATUS_CODES.FORBIDDEN
            );
            return;
          }

          // Check if platform role has at least one permission for this organization module
          const hasAnyPermission =
            permission.canRead ||
            permission.canWrite ||
            permission.canUpdate ||
            permission.canDelete ||
            permission.canApprove ||
            permission.canExport;

          if (!hasAnyPermission) {
            sendError(
              res,
              'You do not have permission to access this resource',
              STATUS_CODES.FORBIDDEN
            );
            return;
          }

          // Platform role has permission, proceed
          next();
          return;
        }

        // No platform role, grant full access (backwards compatibility)
        next();
        return;
      }

      // Block super admins who are NOT impersonating (safety check)
      if (user.isSuperAdmin && !isImpersonating) {
        sendError(
          res,
          'Super admins cannot access organization routes',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // User must have a role
      if (!user.roleId) {
        sendError(
          res,
          'You do not have a role assigned',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // First, find the org module by code
      const moduleRecord = await prisma.orgModule.findUnique({
        where: { code: moduleCode },
      });

      if (!moduleRecord) {
        sendError(
          res,
          `Module ${moduleCode} not found`,
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // Check if module is enabled for this organization
      const orgModuleEnabled = await prisma.organizationModule.findUnique({
        where: {
          organizationId_orgModuleId: {
            organizationId,
            orgModuleId: moduleRecord.id,
          },
        },
      });

      if (!orgModuleEnabled || !orgModuleEnabled.isEnabled) {
        sendError(
          res,
          `The ${moduleCode} module is not enabled for your organization`,
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // Check if user has any permission for this module
      const permission = await prisma.rolePermission.findUnique({
        where: {
          roleId_moduleCode: {
            roleId: user.roleId,
            moduleCode,
          },
        },
      });

      if (!permission) {
        sendError(
          res,
          'You do not have permission to access this resource',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // Check if user has at least one permission
      const hasAnyPermission =
        permission.canRead ||
        permission.canWrite ||
        permission.canUpdate ||
        permission.canDelete ||
        permission.canApprove ||
        permission.canExport;

      if (!hasAnyPermission) {
        sendError(
          res,
          'You do not have permission to access this resource',
          STATUS_CODES.FORBIDDEN
        );
        return;
      }

      // User has at least one permission, proceed
      next();
    } catch (error) {
      console.error('Org permission check error:', error);
      sendError(res, 'Permission check failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  };
};
