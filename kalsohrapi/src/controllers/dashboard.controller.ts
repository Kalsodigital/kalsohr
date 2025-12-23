import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { STATUS_CODES } from '../config/constants';

const prisma = new PrismaClient();

/**
 * Get Super Admin Dashboard Statistics
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Fetch all counts in parallel
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalPlans,
      platformModules,
      orgModules,
    ] = await Promise.all([
      // Total organizations count
      prisma.organization.count({
        where: { isActive: true },
      }),

      // Active organizations count
      prisma.organization.count({
        where: {
          isActive: true,
          status: 'active',
        },
      }),

      // Total users count (all users in the platform)
      prisma.user.count({
        where: { isActive: true },
      }),

      // Total subscription plans
      prisma.subscriptionPlan.count({
        where: { isActive: true },
      }),

      // Platform modules (Super Admin panel modules)
      prisma.platformModule.count({
        where: { isActive: true },
      }),

      // Org modules (Tenant organization modules)
      prisma.orgModule.count({
        where: { isActive: true },
      }),
    ]);

    // Master Data Tables are fixed system tables
    // Count: Country, State, City, BloodGroup, Gender, MaritalStatus, Religion,
    // EducationLevel, DocumentType, OrganizationType, IndustryType, BusinessCategory
    const masterDataTables = 12;

    const stats = {
      // Top stats cards
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalPlans,

      // Platform overview
      platformOverview: {
        masterDataTables,
        platformModules,
        orgModules,
      },
    };

    console.log('📊 Dashboard Stats:', JSON.stringify(stats, null, 2));
    sendSuccess(res, stats, 'Dashboard stats fetched successfully');
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    sendError(res, 'Failed to fetch dashboard stats', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};
