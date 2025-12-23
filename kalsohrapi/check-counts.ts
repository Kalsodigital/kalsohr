import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalPlans,
      platformModules,
      orgModules,
    ] = await Promise.all([
      prisma.organization.count({ where: { isActive: true } }),
      prisma.organization.count({ where: { isActive: true, status: 'active' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
      prisma.platformModule.count({ where: { isActive: true } }),
      prisma.orgModule.count({ where: { isActive: true } }),
    ]);

    console.log('Dashboard Counts:');
    console.log('=================');
    console.log('Total Organizations:', totalOrganizations);
    console.log('Active Organizations:', activeOrganizations);
    console.log('Total Users:', totalUsers);
    console.log('Total Plans:', totalPlans);
    console.log('Platform Modules:', platformModules);
    console.log('Org Modules:', orgModules);
    console.log('Master Data Tables: 12 (fixed)');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkCounts();
