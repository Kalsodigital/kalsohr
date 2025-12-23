import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PermissionAction = 'canRead' | 'canWrite' | 'canUpdate' | 'canDelete' | 'canApprove' | 'canExport';

/**
 * Check if user has a specific permission for a module
 * @param user - User object from request
 * @param moduleCode - Module code to check permission for
 * @param action - Permission action to check
 * @returns true if user has permission, false otherwise
 */
export async function hasPermission(
  user: any,
  moduleCode: string,
  action: PermissionAction
): Promise<boolean> {
  try {
    // Super admins WITHOUT a role have full access
    if (user?.isSuperAdmin && !user?.roleId) {
      return true;
    }

    // If user has no role, no permission
    if (!user?.roleId) {
      return false;
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

    return permission ? !!permission[action] : false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check if user can view audit information (created by/updated by)
 * Users need "canApprove" permission to view audit trails
 */
export async function canViewAuditInfo(user: any, moduleCode: string): Promise<boolean> {
  return hasPermission(user, moduleCode, 'canApprove');
}
