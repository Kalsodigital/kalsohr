import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding platform modules...');

  const platformModules = [
    { name: 'Organizations Management', code: 'organizations', description: 'Create, update, and manage tenant organizations', isCore: true, icon: 'Building2', displayOrder: 1 },
    { name: 'Accounts Management', code: 'accounts', description: 'Manage platform super admin user accounts', isCore: true, icon: 'Users', displayOrder: 2 },
    { name: 'Platform Roles & Permissions', code: 'platform_roles', description: 'Manage platform-level roles and their permissions', isCore: true, icon: 'Shield', displayOrder: 3 },
    { name: 'Subscription Plans', code: 'subscription_plans', description: 'Manage subscription plans and pricing', isCore: true, icon: 'CreditCard', displayOrder: 4 },
    { name: 'System Modules', code: 'system_modules', description: 'Manage available system modules', isCore: true, icon: 'Package', displayOrder: 5 },
    { name: 'System Settings', code: 'system_settings', description: 'Configure system-wide settings and preferences', isCore: true, icon: 'Settings', displayOrder: 6 },
    { name: 'Audit Logs', code: 'audit_logs', description: 'View and manage system audit logs', isCore: true, icon: 'FileText', displayOrder: 7 },
    { name: 'Platform Analytics', code: 'analytics', description: 'View platform-wide analytics and reports', isCore: true, icon: 'BarChart', displayOrder: 8 },
  ];

  for (const module of platformModules) {
    await prisma.module.upsert({
      where: { code: module.code },
      update: {},
      create: module,
    });
    console.log(`✓ ${module.name}`);
  }

  console.log('\n✅ Platform modules added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
