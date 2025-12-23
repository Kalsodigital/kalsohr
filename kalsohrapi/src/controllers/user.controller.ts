import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES, MESSAGES } from '../config/constants';
import { canViewAuditInfo } from '../utils/permissions';

/**
 * Get all users (Super Admin only)
 * GET /api/superadmin/users
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const user = (req as any).user;

    // Get organizationId from query param OR from tenant context (req.organizationId)
    // This supports both superadmin routes (query param) and tenant routes (req.organizationId)
    const organizationId = req.query.organizationId || (req as any).organizationId;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } },
      ];
    }

    // Apply organization filter if provided (and not 'all')
    if (organizationId && organizationId !== 'all') {
      where.organizationId = Number(organizationId);
    }

    // Apply isActive filter if provided
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(user, 'accounts');

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: canViewAudit,
          updatedBy: canViewAudit,
          role: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Fetch subscription limit info if organizationId is provided
    let subscriptionInfo = null;
    if (organizationId && organizationId !== 'all') {
      const organization = await prisma.organization.findUnique({
        where: { id: Number(organizationId) },
        select: {
          subscriptionPlan: {
            select: {
              name: true,
              maxUsers: true,
            },
          },
        },
      });

      if (organization?.subscriptionPlan) {
        const activeUserCount = await prisma.user.count({
          where: {
            organizationId: Number(organizationId),
            isActive: true,
          },
        });

        subscriptionInfo = {
          planName: organization.subscriptionPlan.name,
          maxUsers: organization.subscriptionPlan.maxUsers,
          currentActiveUsers: activeUserCount,
          canAddMore: organization.subscriptionPlan.maxUsers ? activeUserCount < organization.subscriptionPlan.maxUsers : true,
        };
      }
    }

    // Only fetch and attach creator/updater details if user has permission
    if (canViewAudit) {
      const userIds = new Set<number>();
      users.forEach(u => {
        if (u.createdBy) userIds.add(u.createdBy);
        if (u.updatedBy) userIds.add(u.updatedBy);
      });

      const creatorUpdaterUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const userMap = new Map(creatorUpdaterUsers.map(u => [u.id, u]));

      const usersWithAudit = users.map(u => ({
        ...u,
        creator: u.createdBy ? userMap.get(u.createdBy) : null,
        updater: u.updatedBy ? userMap.get(u.updatedBy) : null,
      }));

      return sendSuccess(
        res,
        {
          users: usersWithAudit,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
          ...(subscriptionInfo && { subscriptionInfo }),
        },
        'Users retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        ...(subscriptionInfo && { subscriptionInfo }),
      },
      'Users retrieved successfully'
    );
  } catch (error) {
    console.error('Get users error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get user by ID (Super Admin only)
 * GET /api/superadmin/users/:id
 */
export const getUserById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Check if user has permission to view audit information
    const canViewAudit = await canViewAuditInfo(currentUser, 'accounts');

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: canViewAudit,
        updatedBy: canViewAudit,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(
        res,
        MESSAGES.USER.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    if (canViewAudit) {
      const userIds: number[] = [];
      if (user.createdBy) userIds.push(user.createdBy);
      if (user.updatedBy) userIds.push(user.updatedBy);

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

      const userWithAudit = {
        ...user,
        creator: user.createdBy ? userMap.get(user.createdBy) : null,
        updater: user.updatedBy ? userMap.get(user.updatedBy) : null,
      };

      return sendSuccess(
        res,
        { user: userWithAudit },
        'User retrieved successfully'
      );
    }

    return sendSuccess(
      res,
      { user },
      'User retrieved successfully'
    );
  } catch (error) {
    console.error('Get user error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Create user (Super Admin only)
 * POST /api/superadmin/users
 */
export const createUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      organizationId,
      roleId,
      isActive = true,
      isSuperAdmin = false,
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return sendError(
        res,
        'Email, password, first name, and last name are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // If not creating a super admin, organization is required
    if (!isSuperAdmin && !organizationId) {
      return sendError(
        res,
        'Organization is required for non-super admin users',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return sendError(
        res,
        'Email already exists',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if organization exists (only for non-super admin users)
    if (!isSuperAdmin && organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: Number(organizationId) },
        include: {
          subscriptionPlan: true,
        },
      });

      if (!organization) {
        return sendError(
          res,
          MESSAGES.ORG.NOT_FOUND,
          STATUS_CODES.NOT_FOUND
        );
      }

      // Check subscription plan user limit
      if (organization.subscriptionPlan?.maxUsers) {
        const currentUserCount = await prisma.user.count({
          where: {
            organizationId: Number(organizationId),
            isActive: true,
          },
        });

        if (currentUserCount >= organization.subscriptionPlan.maxUsers) {
          return sendError(
            res,
            `User limit reached. Your ${organization.subscriptionPlan.name} plan allows a maximum of ${organization.subscriptionPlan.maxUsers} users. Please upgrade your plan to add more users.`,
            STATUS_CODES.BAD_REQUEST
          );
        }
      }

      // Check if role exists and belongs to organization
      if (roleId) {
        const role = await prisma.role.findFirst({
          where: {
            id: Number(roleId),
            organizationId: Number(organizationId),
          },
        });

        if (!role) {
          return sendError(
            res,
            'Role not found for this organization',
            STATUS_CODES.NOT_FOUND
          );
        }

        // Check if trying to assign org_admin role
        // org_admin can only be assigned to ONE user per organization
        if (role.code === 'org_admin') {
          const existingOrgAdmin = await prisma.user.findFirst({
            where: {
              organizationId: Number(organizationId),
              role: {
                code: 'org_admin',
              },
            },
          });

          if (existingOrgAdmin) {
            return sendError(
              res,
              'Organization Admin role is already assigned to another user. Only one user can have this role.',
              STATUS_CODES.BAD_REQUEST
            );
          }
        }
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        organizationId: organizationId ? Number(organizationId) : null,
        roleId: roleId ? Number(roleId) : null,
        isActive,
        emailVerified: false,
        isSuperAdmin,
        createdBy: userId,
        updatedBy: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      { user },
      'User created successfully',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create user error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Update user (Super Admin only)
 * PUT /api/superadmin/users/:id
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      roleId,
      isActive,
      password,
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return sendError(
        res,
        MESSAGES.USER.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Prevent modification of isSuperAdmin flag for security
    // Super admins can update user details but cannot change super admin status
    if (req.body.isSuperAdmin !== undefined && req.body.isSuperAdmin !== existingUser.isSuperAdmin) {
      return sendError(
        res,
        'Cannot modify super admin status. This is a protected field.',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if role exists and belongs to organization
    if (roleId && existingUser.organizationId) {
      const role = await prisma.role.findFirst({
        where: {
          id: Number(roleId),
          organizationId: existingUser.organizationId,
        },
      });

      if (!role) {
        return sendError(
          res,
          'Role not found for this organization',
          STATUS_CODES.NOT_FOUND
        );
      }

      // Check if trying to assign org_admin role
      // org_admin can only be assigned to ONE user per organization
      if (role.code === 'org_admin' && existingUser.roleId !== Number(roleId)) {
        const existingOrgAdmin = await prisma.user.findFirst({
          where: {
            organizationId: existingUser.organizationId,
            role: {
              code: 'org_admin',
            },
            id: {
              not: Number(id), // Exclude current user
            },
          },
        });

        if (existingOrgAdmin) {
          return sendError(
            res,
            'Organization Admin role is already assigned to another user. Only one user can have this role.',
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
    }

    // Check subscription plan user limit when activating a deactivated user
    if (isActive === true && existingUser.isActive === false && existingUser.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: existingUser.organizationId },
        include: {
          subscriptionPlan: true,
        },
      });

      if (organization?.subscriptionPlan?.maxUsers) {
        const currentUserCount = await prisma.user.count({
          where: {
            organizationId: existingUser.organizationId,
            isActive: true,
          },
        });

        if (currentUserCount >= organization.subscriptionPlan.maxUsers) {
          return sendError(
            res,
            `User limit reached. Your ${organization.subscriptionPlan.name} plan allows a maximum of ${organization.subscriptionPlan.maxUsers} active users. Please upgrade your plan or deactivate another user first.`,
            STATUS_CODES.BAD_REQUEST
          );
        }
      }
    }

    // Build update data
    const updateData: any = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(roleId !== undefined && { roleId: roleId ? Number(roleId) : null }),
      ...(isActive !== undefined && { isActive }),
      updatedBy: userId,
    };

    // Hash new password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return sendSuccess(
      res,
      { user },
      'User updated successfully'
    );
  } catch (error) {
    console.error('Update user error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Delete user (Super Admin only)
 * DELETE /api/superadmin/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return sendError(
        res,
        MESSAGES.USER.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    // Prevent deletion of super admin
    if (user.isSuperAdmin) {
      return sendError(
        res,
        'Cannot delete super admin user',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(
      res,
      null,
      'User deleted successfully'
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};
