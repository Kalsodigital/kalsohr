import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { sendSuccess, sendError } from '../utils/response';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { STATUS_CODES, MESSAGES } from '../config/constants';

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('Login request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);

    const { email, password, orgSlug } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Validation failed - email:', email, 'password:', password ? 'present' : 'missing');
      return sendError(
        res,
        'Email and password are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
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
            isActive: true,
            status: true,
          },
        },
      },
    });

    // Fetch user permissions if they have a role
    let permissions: any[] = [];
    if (user && user.roleId) {
      permissions = await prisma.rolePermission.findMany({
        where: { roleId: user.roleId },
        select: {
          moduleCode: true,
          canRead: true,
          canWrite: true,
          canUpdate: true,
          canDelete: true,
          canApprove: true,
          canExport: true,
        },
      });
    }

    if (!user) {
      return sendError(
        res,
        MESSAGES.AUTH.INVALID_CREDENTIALS,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // ============================================
    // ORGANIZATION CONTEXT VALIDATION
    // ============================================

    // CASE 1: Super admin trying to login with orgSlug (FORBIDDEN)
    if (user.isSuperAdmin && orgSlug) {
      return sendError(
        res,
        'Super admins cannot login through organization portal. Please use the admin login at /login',
        STATUS_CODES.FORBIDDEN
      );
    }

    // CASE 2: Organization user - validate organization exists and is active
    if (!user.isSuperAdmin) {
      if (!user.organization) {
        return sendError(
          res,
          'User does not belong to any organization',
          STATUS_CODES.FORBIDDEN
        );
      }

      // If orgSlug is provided, validate it matches user's organization
      if (orgSlug && user.organization.slug !== orgSlug) {
        return sendError(
          res,
          'Invalid organization. You do not have access to this organization',
          STATUS_CODES.FORBIDDEN
        );
      }

      // Validate organization is active
      if (!user.organization.isActive || user.organization.status !== 'active') {
        const message = user.organization.status === 'suspended'
          ? MESSAGES.ORG.SUSPENDED
          : MESSAGES.ORG.INACTIVE;
        return sendError(res, message, STATUS_CODES.FORBIDDEN);
      }
    }

    // ============================================
    // USER STATUS VALIDATION
    // ============================================

    // Check if user is active
    if (!user.isActive) {
      return sendError(
        res,
        MESSAGES.AUTH.ACCOUNT_INACTIVE,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return sendError(
        res,
        MESSAGES.AUTH.ACCOUNT_LOCKED,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          // Lock account after 5 failed attempts
          ...(user.failedLoginAttempts + 1 >= 5 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          }),
        },
      });

      return sendError(
        res,
        MESSAGES.AUTH.INVALID_CREDENTIALS,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roleId: user.roleId,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update user login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Prepare response data
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin,
        role: user.role,
        organization: user.organization
          ? {
              id: user.organization.id,
              name: user.organization.name,
              slug: user.organization.slug,
            }
          : null,
        permissions: permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };

    return sendSuccess(
      res,
      responseData,
      MESSAGES.AUTH.LOGIN_SUCCESS,
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Login error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return sendError(
        res,
        MESSAGES.AUTH.UNAUTHORIZED,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isSuperAdmin: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
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
            logo: true,
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

    // Fetch user permissions if they have a role
    let permissions: any[] = [];
    if (user && user.role) {
      // For super admins (platform roles), fetch permissions for BOTH platform and org modules
      // This allows them to access org portals when impersonating
      const isPlatformRole = user.isSuperAdmin;

      if (isPlatformRole) {
        // Get all permissions for this role (includes both platform and org module codes)
        permissions = await prisma.rolePermission.findMany({
          where: { roleId: user.role.id },
          select: {
            moduleCode: true,
            canRead: true,
            canWrite: true,
            canUpdate: true,
            canDelete: true,
            canApprove: true,
            canExport: true,
          },
        });
      } else {
        // Regular organization users: only fetch their role permissions
        permissions = await prisma.rolePermission.findMany({
          where: { roleId: user.role.id },
          select: {
            moduleCode: true,
            canRead: true,
            canWrite: true,
            canUpdate: true,
            canDelete: true,
            canApprove: true,
            canExport: true,
          },
        });
      }
    }

    return sendSuccess(res, { user: { ...user, permissions } }, 'User data retrieved successfully');
  } catch (error) {
    console.error('Get current user error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<Response> => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // Optionally, you can implement a token blacklist here

  return sendSuccess(res, null, MESSAGES.AUTH.LOGOUT_SUCCESS);
};

/**
 * Refresh token
 * POST /api/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return sendError(
        res,
        'Refresh token is required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Verify refresh token
    const decoded = await import('../utils/jwt').then((m) => m.verifyToken(token));

    if (!decoded) {
      return sendError(
        res,
        MESSAGES.AUTH.TOKEN_INVALID,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      organizationId: decoded.organizationId,
      roleId: decoded.roleId,
      isSuperAdmin: decoded.isSuperAdmin,
    });

    return sendSuccess(
      res,
      { accessToken: newAccessToken },
      'Token refreshed successfully'
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(
      res,
      MESSAGES.GENERAL.ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
};
