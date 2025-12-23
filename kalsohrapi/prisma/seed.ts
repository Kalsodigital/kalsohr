/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. SUBSCRIPTION PLANS
  // ============================================
  console.log('📦 Creating subscription plans...');

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'basic' },
    update: {},
    create: {
      name: 'Basic',
      code: 'basic',
      description: 'Perfect for small businesses',
      priceMonthly: 999.00,
      priceYearly: 9990.00,
      currency: 'INR',
      maxUsers: 5,
      maxEmployees: 25,
      maxStorageMb: 500,
      features: JSON.stringify(['employees', 'attendance', 'leave', 'master_data', 'reports']),
      isActive: true,
      displayOrder: 1,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'premium' },
    update: {},
    create: {
      name: 'Premium',
      code: 'premium',
      description: 'For growing teams with recruitment needs',
      priceMonthly: 2999.00,
      priceYearly: 29990.00,
      currency: 'INR',
      maxUsers: 15,
      maxEmployees: 100,
      maxStorageMb: 2000,
      features: JSON.stringify(['employees', 'attendance', 'leave', 'master_data', 'reports', 'recruitment']),
      isActive: true,
      displayOrder: 2,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise',
      code: 'enterprise',
      description: 'Unlimited access for large organizations',
      priceMonthly: 9999.00,
      priceYearly: 99990.00,
      currency: 'INR',
      maxUsers: -1, // Unlimited
      maxEmployees: -1, // Unlimited
      maxStorageMb: 10000,
      features: JSON.stringify(['employees', 'attendance', 'leave', 'master_data', 'reports', 'recruitment', 'payroll', 'performance']),
      isActive: true,
      displayOrder: 3,
    },
  });

  console.log('✅ Subscription plans created\n');

  // ============================================
  // 2. PLATFORM MODULES (SuperAdmin Only)
  // ============================================
  console.log('🧩 Creating platform modules...');

  const platformModulesData = [
    { name: 'Organizations Management', code: 'organizations', description: 'Manage tenant organizations', icon: 'Building2', displayOrder: 1 },
    { name: 'Accounts Management', code: 'accounts', description: 'Manage user accounts across platform', icon: 'Users', displayOrder: 2 },
    { name: 'Platform Roles & Permissions', code: 'platform_roles', description: 'Manage platform-level roles', icon: 'Shield', displayOrder: 3 },
    { name: 'Subscription Plans', code: 'subscription_plans', description: 'Manage subscription plans and pricing', icon: 'CreditCard', displayOrder: 4 },
    { name: 'System Modules', code: 'system_modules', description: 'Configure available modules', icon: 'Package', displayOrder: 5 },
    { name: 'System Settings', code: 'system_settings', description: 'Platform-wide settings', icon: 'Settings', displayOrder: 6 },
    { name: 'Audit Logs', code: 'audit_logs', description: 'View platform audit logs', icon: 'FileText', displayOrder: 7 },
    { name: 'Platform Analytics', code: 'analytics', description: 'Platform usage analytics', icon: 'BarChart', displayOrder: 8 },
  ];

  for (const mod of platformModulesData) {
    await prisma.platformModule.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
  }

  console.log('✅ Platform modules created (8 modules)\n');

  // ============================================
  // 2b. PLATFORM ROLES (SuperAdmin Roles)
  // ============================================
  console.log('🎭 Creating platform roles...');

  // Platform Admin - Full access to all platform modules
  let platformAdmin = await prisma.role.findFirst({
    where: { organizationId: null, code: 'platform_admin' }
  });

  if (!platformAdmin) {
    platformAdmin = await prisma.role.create({
      data: {
        organizationId: null, // Platform role (no organization)
        name: 'Platform Admin',
        code: 'platform_admin',
        description: 'Full access to all platform modules and settings',
        isSystem: true,
        isActive: true,
      },
    });
  }

  // Create full permissions for Platform Admin
  for (const mod of platformModulesData) {
    const existingPerm = await prisma.rolePermission.findFirst({
      where: { roleId: platformAdmin.id, moduleCode: mod.code }
    });
    if (!existingPerm) {
      await prisma.rolePermission.create({
        data: {
          roleId: platformAdmin.id,
          moduleCode: mod.code,
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

  // Support Admin - Read-only access for support purposes
  let supportAdmin = await prisma.role.findFirst({
    where: { organizationId: null, code: 'support_admin' }
  });

  if (!supportAdmin) {
    supportAdmin = await prisma.role.create({
      data: {
        organizationId: null, // Platform role (no organization)
        name: 'Support Admin',
        code: 'support_admin',
        description: 'Read-only access for customer support and troubleshooting',
        isSystem: true,
        isActive: true,
      },
    });
  }

  // Create read-only permissions for Support Admin
  for (const mod of platformModulesData) {
    const existingPerm = await prisma.rolePermission.findFirst({
      where: { roleId: supportAdmin.id, moduleCode: mod.code }
    });
    if (!existingPerm) {
      await prisma.rolePermission.create({
        data: {
          roleId: supportAdmin.id,
          moduleCode: mod.code,
          canRead: true,
          canWrite: false,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
          canExport: true, // Allow export for support
        },
      });
    }
  }

  console.log('✅ Platform roles created (Platform Admin, Support Admin)\n');

  // ============================================
  // 3. ORG MODULES (Tenant Organizations)
  // ============================================
  console.log('🧩 Creating org modules...');

  const orgModulesData = [
    { name: 'Dashboard', code: 'dashboard', description: 'Organization dashboard', icon: 'LayoutDashboard', isCore: true, displayOrder: 1 },
    { name: 'Employees', code: 'employees', description: 'Employee management', icon: 'Users', isCore: true, displayOrder: 2 },
    { name: 'Attendance', code: 'attendance', description: 'Attendance tracking', icon: 'Calendar', isCore: true, displayOrder: 3 },
    { name: 'Leave Management', code: 'leave', description: 'Leave requests and approvals', icon: 'CalendarOff', isCore: true, displayOrder: 4 },
    { name: 'Master Data', code: 'master_data', description: 'Organization master data', icon: 'Database', isCore: true, displayOrder: 5 },
    { name: 'Reports', code: 'reports', description: 'Reports and analytics', icon: 'FileText', isCore: true, displayOrder: 6 },
    { name: 'Recruitment', code: 'recruitment', description: 'Hiring and recruitment', icon: 'Briefcase', isCore: false, displayOrder: 7 },
    { name: 'Payroll', code: 'payroll', description: 'Payroll management', icon: 'DollarSign', isCore: false, displayOrder: 8 },
    { name: 'Roles & Permissions', code: 'roles', description: 'Organization roles management', icon: 'Shield', isCore: true, displayOrder: 9 },
    { name: 'Users', code: 'users', description: 'Organization user management', icon: 'UserCog', isCore: true, displayOrder: 10 },
    { name: 'Settings', code: 'settings', description: 'Organization settings', icon: 'Settings', isCore: true, displayOrder: 11 },
  ];

  const createdOrgModules: Record<string, number> = {};

  for (const mod of orgModulesData) {
    const created = await prisma.orgModule.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
    createdOrgModules[mod.code] = created.id;
  }

  console.log('✅ Org modules created (11 modules)\n');

  // ============================================
  // 4. PLAN MODULES (Link Plans to Org Modules)
  // ============================================
  console.log('🔗 Linking modules to subscription plans...');

  // Define which modules each plan includes
  const planModuleMapping = {
    basic: ['dashboard', 'employees', 'attendance', 'leave', 'master_data', 'reports', 'roles', 'users', 'settings'], // Core only
    premium: ['dashboard', 'employees', 'attendance', 'leave', 'master_data', 'reports', 'recruitment', 'roles', 'users', 'settings'], // Core + recruitment
    enterprise: ['dashboard', 'employees', 'attendance', 'leave', 'master_data', 'reports', 'recruitment', 'payroll', 'roles', 'users', 'settings'], // All modules
  };

  // Create plan-module links
  for (const [planCode, moduleCodes] of Object.entries(planModuleMapping)) {
    const plan = planCode === 'basic' ? basicPlan : planCode === 'premium' ? premiumPlan : enterprisePlan;

    for (const moduleCode of moduleCodes) {
      const orgModuleId = createdOrgModules[moduleCode];
      if (orgModuleId) {
        await prisma.planModule.upsert({
          where: {
            subscriptionPlanId_orgModuleId: {
              subscriptionPlanId: plan.id,
              orgModuleId: orgModuleId,
            },
          },
          update: {},
          create: {
            subscriptionPlanId: plan.id,
            orgModuleId: orgModuleId,
          },
        });
      }
    }
  }

  console.log('✅ Plan modules linked');
  console.log('   • Basic: 9 modules (core only)');
  console.log('   • Premium: 10 modules (core + recruitment)');
  console.log('   • Enterprise: 11 modules (all)\n');


  // ============================================
  // 3. PLATFORM MASTERS - COUNTRIES
  // ============================================
  console.log('🌍 Creating countries...');

  const india = await prisma.country.upsert({
    where: { code: 'IND' },
    update: {},
    create: {
      name: 'India',
      code: 'IND',
      iso2: 'IN',
      phoneCode: '+91',
      isActive: true,
      displayOrder: 1,
    },
  });

  console.log('✅ Countries created\n');

  // ============================================
  // 4. PLATFORM MASTERS - STATES/UTs
  // ============================================
  console.log('🗺️  Creating Indian states and union territories...');

  const indianStates = [
    // 28 States
    { name: 'Andhra Pradesh', code: 'AP', type: 'State', displayOrder: 1 },
    { name: 'Arunachal Pradesh', code: 'AR', type: 'State', displayOrder: 2 },
    { name: 'Assam', code: 'AS', type: 'State', displayOrder: 3 },
    { name: 'Bihar', code: 'BR', type: 'State', displayOrder: 4 },
    { name: 'Chhattisgarh', code: 'CG', type: 'State', displayOrder: 5 },
    { name: 'Goa', code: 'GA', type: 'State', displayOrder: 6 },
    { name: 'Gujarat', code: 'GJ', type: 'State', displayOrder: 7 },
    { name: 'Haryana', code: 'HR', type: 'State', displayOrder: 8 },
    { name: 'Himachal Pradesh', code: 'HP', type: 'State', displayOrder: 9 },
    { name: 'Jharkhand', code: 'JH', type: 'State', displayOrder: 10 },
    { name: 'Karnataka', code: 'KA', type: 'State', displayOrder: 11 },
    { name: 'Kerala', code: 'KL', type: 'State', displayOrder: 12 },
    { name: 'Madhya Pradesh', code: 'MP', type: 'State', displayOrder: 13 },
    { name: 'Maharashtra', code: 'MH', type: 'State', displayOrder: 14 },
    { name: 'Manipur', code: 'MN', type: 'State', displayOrder: 15 },
    { name: 'Meghalaya', code: 'ML', type: 'State', displayOrder: 16 },
    { name: 'Mizoram', code: 'MZ', type: 'State', displayOrder: 17 },
    { name: 'Nagaland', code: 'NL', type: 'State', displayOrder: 18 },
    { name: 'Odisha', code: 'OD', type: 'State', displayOrder: 19 },
    { name: 'Punjab', code: 'PB', type: 'State', displayOrder: 20 },
    { name: 'Rajasthan', code: 'RJ', type: 'State', displayOrder: 21 },
    { name: 'Sikkim', code: 'SK', type: 'State', displayOrder: 22 },
    { name: 'Tamil Nadu', code: 'TN', type: 'State', displayOrder: 23 },
    { name: 'Telangana', code: 'TG', type: 'State', displayOrder: 24 },
    { name: 'Tripura', code: 'TR', type: 'State', displayOrder: 25 },
    { name: 'Uttar Pradesh', code: 'UP', type: 'State', displayOrder: 26 },
    { name: 'Uttarakhand', code: 'UK', type: 'State', displayOrder: 27 },
    { name: 'West Bengal', code: 'WB', type: 'State', displayOrder: 28 },

    // 8 Union Territories
    { name: 'Andaman and Nicobar Islands', code: 'AN', type: 'Union Territory', displayOrder: 29 },
    { name: 'Chandigarh', code: 'CH', type: 'Union Territory', displayOrder: 30 },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', type: 'Union Territory', displayOrder: 31 },
    { name: 'Delhi', code: 'DL', type: 'Union Territory', displayOrder: 32 },
    { name: 'Jammu and Kashmir', code: 'JK', type: 'Union Territory', displayOrder: 33 },
    { name: 'Ladakh', code: 'LA', type: 'Union Territory', displayOrder: 34 },
    { name: 'Lakshadweep', code: 'LD', type: 'Union Territory', displayOrder: 35 },
    { name: 'Puducherry', code: 'PY', type: 'Union Territory', displayOrder: 36 },
  ];

  for (const state of indianStates) {
    await prisma.state.upsert({
      where: { countryId_code: { countryId: india.id, code: state.code } },
      update: {},
      create: {
        countryId: india.id,
        name: state.name,
        code: state.code,
        type: state.type,
        isActive: true,
        displayOrder: state.displayOrder,
      },
    });
  }

  console.log('✅ Created 28 states + 8 union territories\n');

  // ============================================
  // 5. BLOOD GROUPS
  // ============================================
  console.log('🩸 Creating blood groups...');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  for (const [index, bg] of bloodGroups.entries()) {
    await prisma.bloodGroup.upsert({
      where: { code: bg },
      update: {},
      create: {
        name: bg,
        code: bg,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 8 blood groups\n');

  // ============================================
  // 6. GENDERS
  // ============================================
  console.log('⚧ Creating genders...');

  const genders = [
    { name: 'Male', code: 'MALE' },
    { name: 'Female', code: 'FEMALE' },
    { name: 'Other', code: 'OTHER' },
    { name: 'Prefer not to say', code: 'PREFER_NOT_TO_SAY' },
  ];

  for (const [index, gender] of genders.entries()) {
    await prisma.gender.upsert({
      where: { code: gender.code },
      update: {},
      create: {
        name: gender.name,
        code: gender.code,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 4 genders\n');

  // ============================================
  // 7. MARITAL STATUS
  // ============================================
  console.log('💍 Creating marital statuses...');

  const maritalStatuses = [
    { name: 'Single', code: 'SINGLE' },
    { name: 'Married', code: 'MARRIED' },
    { name: 'Divorced', code: 'DIVORCED' },
    { name: 'Widowed', code: 'WIDOWED' },
    { name: 'Separated', code: 'SEPARATED' },
  ];

  for (const [index, status] of maritalStatuses.entries()) {
    await prisma.maritalStatus.upsert({
      where: { code: status.code },
      update: {},
      create: {
        name: status.name,
        code: status.code,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 5 marital statuses\n');

  // ============================================
  // 8. RELIGIONS
  // ============================================
  console.log('🕉️ Creating religions...');

  const religions = [
    { name: 'Hinduism', code: 'HINDUISM' },
    { name: 'Islam', code: 'ISLAM' },
    { name: 'Christianity', code: 'CHRISTIANITY' },
    { name: 'Sikhism', code: 'SIKHISM' },
    { name: 'Buddhism', code: 'BUDDHISM' },
    { name: 'Jainism', code: 'JAINISM' },
    { name: 'Zoroastrianism', code: 'ZOROASTRIANISM' },
    { name: 'Other', code: 'OTHER' },
    { name: 'Prefer not to say', code: 'PREFER_NOT_TO_SAY' },
  ];

  for (const [index, religion] of religions.entries()) {
    await prisma.religion.upsert({
      where: { code: religion.code },
      update: {},
      create: {
        name: religion.name,
        code: religion.code,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 9 religions\n');

  // ============================================
  // 9. EDUCATION LEVELS
  // ============================================
  console.log('🎓 Creating education levels...');

  const educationLevels = [
    { name: 'Below 10th', code: 'BELOW_10TH', level: 0 },
    { name: '10th Pass', code: '10TH_PASS', level: 1 },
    { name: '12th Pass', code: '12TH_PASS', level: 2 },
    { name: 'Diploma', code: 'DIPLOMA', level: 3 },
    { name: "Bachelor's Degree", code: 'BACHELORS', level: 4 },
    { name: "Master's Degree", code: 'MASTERS', level: 5 },
    { name: 'Doctorate (PhD)', code: 'DOCTORATE', level: 6 },
    { name: 'Post-Doctorate', code: 'POST_DOCTORATE', level: 7 },
  ];

  for (const [index, edu] of educationLevels.entries()) {
    await prisma.educationLevel.upsert({
      where: { code: edu.code },
      update: {},
      create: {
        name: edu.name,
        code: edu.code,
        level: edu.level,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 8 education levels\n');

  // ============================================
  // 10. CITIES (Major Indian Cities)
  // ============================================
  console.log('🏙️ Creating major cities...');

  // Get states for FK references
  const maharashtra = await prisma.state.findFirst({ where: { code: 'MH' } });
  const karnataka = await prisma.state.findFirst({ where: { code: 'KA' } });
  const delhi = await prisma.state.findFirst({ where: { code: 'DL' } });
  const tamilNadu = await prisma.state.findFirst({ where: { code: 'TN' } });
  const telangana = await prisma.state.findFirst({ where: { code: 'TG' } });
  const westBengal = await prisma.state.findFirst({ where: { code: 'WB' } });
  const gujarat = await prisma.state.findFirst({ where: { code: 'GJ' } });
  const rajasthan = await prisma.state.findFirst({ where: { code: 'RJ' } });
  const uttarPradesh = await prisma.state.findFirst({ where: { code: 'UP' } });
  const madhyaPradesh = await prisma.state.findFirst({ where: { code: 'MP' } });

  const cities = [
    // Maharashtra
    { stateId: maharashtra!.id, name: 'Mumbai', code: 'MUM', type: 'City' },
    { stateId: maharashtra!.id, name: 'Pune', code: 'PUN', type: 'City' },
    { stateId: maharashtra!.id, name: 'Nagpur', code: 'NAG', type: 'City' },
    { stateId: maharashtra!.id, name: 'Nashik', code: 'NSK', type: 'City' },
    { stateId: maharashtra!.id, name: 'Aurangabad', code: 'AUR', type: 'City' },

    // Karnataka
    { stateId: karnataka!.id, name: 'Bangalore', code: 'BLR', type: 'City' },
    { stateId: karnataka!.id, name: 'Mysore', code: 'MYS', type: 'City' },
    { stateId: karnataka!.id, name: 'Hubli', code: 'HUB', type: 'City' },
    { stateId: karnataka!.id, name: 'Mangalore', code: 'MNG', type: 'City' },

    // Delhi
    { stateId: delhi!.id, name: 'New Delhi', code: 'NDL', type: 'City' },
    { stateId: delhi!.id, name: 'Central Delhi', code: 'CDL', type: 'City' },
    { stateId: delhi!.id, name: 'South Delhi', code: 'SDL', type: 'City' },

    // Tamil Nadu
    { stateId: tamilNadu!.id, name: 'Chennai', code: 'CHN', type: 'City' },
    { stateId: tamilNadu!.id, name: 'Coimbatore', code: 'COI', type: 'City' },
    { stateId: tamilNadu!.id, name: 'Madurai', code: 'MDU', type: 'City' },
    { stateId: tamilNadu!.id, name: 'Tiruchirappalli', code: 'TRI', type: 'City' },

    // Telangana
    { stateId: telangana!.id, name: 'Hyderabad', code: 'HYD', type: 'City' },
    { stateId: telangana!.id, name: 'Warangal', code: 'WRL', type: 'City' },

    // West Bengal
    { stateId: westBengal!.id, name: 'Kolkata', code: 'KOL', type: 'City' },
    { stateId: westBengal!.id, name: 'Howrah', code: 'HOW', type: 'City' },

    // Gujarat
    { stateId: gujarat!.id, name: 'Ahmedabad', code: 'AMD', type: 'City' },
    { stateId: gujarat!.id, name: 'Surat', code: 'SRT', type: 'City' },
    { stateId: gujarat!.id, name: 'Vadodara', code: 'VAD', type: 'City' },

    // Rajasthan
    { stateId: rajasthan!.id, name: 'Jaipur', code: 'JAI', type: 'City' },
    { stateId: rajasthan!.id, name: 'Udaipur', code: 'UDR', type: 'City' },
    { stateId: rajasthan!.id, name: 'Jodhpur', code: 'JDH', type: 'City' },

    // Uttar Pradesh
    { stateId: uttarPradesh!.id, name: 'Lucknow', code: 'LKO', type: 'City' },
    { stateId: uttarPradesh!.id, name: 'Kanpur', code: 'KNP', type: 'City' },
    { stateId: uttarPradesh!.id, name: 'Agra', code: 'AGR', type: 'City' },
    { stateId: uttarPradesh!.id, name: 'Varanasi', code: 'VNS', type: 'City' },

    // Madhya Pradesh
    { stateId: madhyaPradesh!.id, name: 'Bhopal', code: 'BHO', type: 'City' },
    { stateId: madhyaPradesh!.id, name: 'Indore', code: 'IND', type: 'City' },
  ];

  for (const [index, city] of cities.entries()) {
    await prisma.city.upsert({
      where: { stateId_code: { stateId: city.stateId, code: city.code } },
      update: {},
      create: {
        stateId: city.stateId,
        name: city.name,
        code: city.code,
        type: city.type,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 32 major cities\n');

  // ============================================
  // 11. DOCUMENT TYPES
  // ============================================
  console.log('📄 Creating document types...');

  const documentTypes = [
    { name: 'Aadhar Card', code: 'AADHAR', category: 'Identity', isMandatory: true },
    { name: 'PAN Card', code: 'PAN', category: 'Identity', isMandatory: true },
    { name: 'Passport', code: 'PASSPORT', category: 'Identity', isMandatory: false },
    { name: 'Driving License', code: 'DRIVING_LICENSE', category: 'Identity', isMandatory: false },
    { name: 'Voter ID', code: 'VOTER_ID', category: 'Identity', isMandatory: false },
    { name: 'Resume/CV', code: 'RESUME', category: 'Employment', isMandatory: true },
    { name: 'Educational Certificates', code: 'EDUCATION_CERT', category: 'Education', isMandatory: false },
    { name: 'Degree Certificates', code: 'DEGREE_CERT', category: 'Education', isMandatory: false },
    { name: 'Experience Letters', code: 'EXPERIENCE_LETTER', category: 'Employment', isMandatory: false },
    { name: 'Relieving Letter', code: 'RELIEVING_LETTER', category: 'Employment', isMandatory: false },
    { name: 'Offer Letter', code: 'OFFER_LETTER', category: 'Employment', isMandatory: false },
    { name: 'Appointment Letter', code: 'APPOINTMENT_LETTER', category: 'Employment', isMandatory: false },
    { name: 'Bank Passbook/Cheque', code: 'BANK_PROOF', category: 'Financial', isMandatory: false },
    { name: 'Salary Slips', code: 'SALARY_SLIP', category: 'Financial', isMandatory: false },
    { name: 'Medical Certificate', code: 'MEDICAL_CERT', category: 'Medical', isMandatory: false },
  ];

  for (const [index, docType] of documentTypes.entries()) {
    await prisma.documentType.upsert({
      where: { code: docType.code },
      update: {},
      create: {
        name: docType.name,
        code: docType.code,
        category: docType.category,
        isMandatory: docType.isMandatory,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 15 document types\n');

  // ============================================
  // 12. ORGANIZATION TYPES
  // ============================================
  console.log('🏛️ Creating organization types...');

  const organizationTypes = [
    { name: 'Private Limited Company', code: 'PVT_LTD', description: 'Private Limited Company (Pvt Ltd)' },
    { name: 'Public Limited Company', code: 'PUB_LTD', description: 'Public Limited Company' },
    { name: 'Limited Liability Partnership', code: 'LLP', description: 'Limited Liability Partnership' },
    { name: 'Partnership Firm', code: 'PARTNERSHIP', description: 'Partnership Firm' },
    { name: 'Sole Proprietorship', code: 'SOLE_PROP', description: 'Sole Proprietorship' },
    { name: 'One Person Company', code: 'OPC', description: 'One Person Company (OPC)' },
    { name: 'Non-Profit Organization', code: 'NPO', description: 'Non-Profit Organization / NGO' },
    { name: 'Trust', code: 'TRUST', description: 'Trust / Foundation' },
    { name: 'Cooperative Society', code: 'COOPERATIVE', description: 'Cooperative Society' },
    { name: 'Government Organization', code: 'GOVT', description: 'Government Organization' },
  ];

  for (const [index, orgType] of organizationTypes.entries()) {
    await prisma.organizationType.upsert({
      where: { code: orgType.code },
      update: {},
      create: {
        name: orgType.name,
        code: orgType.code,
        description: orgType.description,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 10 organization types\n');

  // ============================================
  // 13. INDUSTRY TYPES
  // ============================================
  console.log('🏭 Creating industry types...');

  const industryTypes = [
    { name: 'Information Technology', code: 'IT', description: 'IT Services, Software Development', icon: 'Monitor' },
    { name: 'Healthcare & Pharmaceuticals', code: 'HEALTHCARE', description: 'Hospitals, Clinics, Pharma companies', icon: 'Heart' },
    { name: 'Manufacturing', code: 'MANUFACTURING', description: 'Production and Manufacturing', icon: 'Factory' },
    { name: 'Retail & E-commerce', code: 'RETAIL', description: 'Retail stores, Online shopping', icon: 'ShoppingCart' },
    { name: 'Banking & Finance', code: 'BANKING', description: 'Banks, Insurance, Financial Services', icon: 'Landmark' },
    { name: 'Education', code: 'EDUCATION', description: 'Schools, Colleges, EdTech', icon: 'GraduationCap' },
    { name: 'Hospitality & Tourism', code: 'HOSPITALITY', description: 'Hotels, Restaurants, Travel', icon: 'Hotel' },
    { name: 'Real Estate & Construction', code: 'REALESTATE', description: 'Construction, Property Development', icon: 'Building' },
    { name: 'Telecommunications', code: 'TELECOM', description: 'Telecom, ISPs, Mobile services', icon: 'Phone' },
    { name: 'Media & Entertainment', code: 'MEDIA', description: 'TV, Film, Digital Media', icon: 'Film' },
    { name: 'Logistics & Transportation', code: 'LOGISTICS', description: 'Shipping, Warehousing, Transport', icon: 'Truck' },
    { name: 'Agriculture & Farming', code: 'AGRICULTURE', description: 'Farming, Agribusiness', icon: 'Leaf' },
    { name: 'Energy & Utilities', code: 'ENERGY', description: 'Power, Oil & Gas, Renewable Energy', icon: 'Zap' },
    { name: 'Textiles & Apparel', code: 'TEXTILES', description: 'Textile manufacturing, Fashion', icon: 'Shirt' },
    { name: 'Automotive', code: 'AUTOMOTIVE', description: 'Automobile manufacturing, Auto parts', icon: 'Car' },
    { name: 'Food & Beverages', code: 'FOOD', description: 'Food processing, FMCG', icon: 'UtensilsCrossed' },
    { name: 'Legal Services', code: 'LEGAL', description: 'Law firms, Legal consultancy', icon: 'Scale' },
    { name: 'Consulting', code: 'CONSULTING', description: 'Business consulting, Advisory', icon: 'Briefcase' },
    { name: 'Other', code: 'OTHER', description: 'Other industries', icon: 'MoreHorizontal' },
  ];

  for (const [index, industry] of industryTypes.entries()) {
    await prisma.industryType.upsert({
      where: { code: industry.code },
      update: {},
      create: {
        name: industry.name,
        code: industry.code,
        description: industry.description,
        icon: industry.icon,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 19 industry types\n');

  // ============================================
  // 14. BUSINESS CATEGORIES
  // ============================================
  console.log('📊 Creating business categories...');

  const businessCategories = [
    { name: 'Startup', code: 'STARTUP', description: 'Early-stage companies (< 3 years, < 50 employees)' },
    { name: 'Small Business', code: 'SMALL', description: 'Small businesses (< 50 employees)' },
    { name: 'Medium Enterprise', code: 'MEDIUM', description: 'Medium-sized enterprises (50-250 employees)' },
    { name: 'Large Enterprise', code: 'LARGE', description: 'Large enterprises (250-1000 employees)' },
    { name: 'Corporate', code: 'CORPORATE', description: 'Large corporations (1000+ employees)' },
    { name: 'Multinational', code: 'MNC', description: 'Multinational corporations' },
    { name: 'Government', code: 'GOVT', description: 'Government departments and agencies' },
    { name: 'Public Sector', code: 'PSU', description: 'Public Sector Undertakings' },
  ];

  for (const [index, category] of businessCategories.entries()) {
    await prisma.businessCategory.upsert({
      where: { code: category.code },
      update: {},
      create: {
        name: category.name,
        code: category.code,
        description: category.description,
        isActive: true,
        displayOrder: index + 1,
      },
    });
  }

  console.log('✅ Created 8 business categories\n');

  // ============================================
  // 15. SUPER ADMIN USER
  // ============================================
  console.log('👤 Creating super admin user...');

  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kalsohr.com' },
    update: {},
    create: {
      email: 'superadmin@kalsohr.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ Super admin created');
  console.log('   📧 Email: superadmin@kalsohr.com');
  console.log('   🔑 Password: Admin@123\n');

  // ============================================
  // 6. TEST ORGANIZATION
  // ============================================
  console.log('🏢 Creating test organization...');

  // Get Mumbai city for the test organization
  const mumbaiCity = await prisma.city.findFirst({
    where: { code: 'MUM' },
    include: { state: true },
  });

  const testOrg = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      code: 'DEMO001',
      email: 'contact@democompany.com',
      phone: '+91 9876543210',
      countryId: india.id,
      stateId: mumbaiCity?.state?.id || maharashtra!.id,
      cityId: mumbaiCity?.id,
      subscriptionPlanId: premiumPlan.id,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      maxUsers: 15,
      maxEmployees: 100,
      maxStorageMb: 2000,
      isActive: true,
      status: 'active',
    },
  });

  console.log('✅ Test organization created\n');

  // ============================================
  // 5. ENABLE MODULES FOR TEST ORG (from Premium Plan)
  // ============================================
  console.log('🔌 Enabling modules for test organization...');

  // Premium plan modules: dashboard, employees, attendance, leave, master_data, reports, recruitment, roles, users, settings
  const premiumModuleCodes = ['dashboard', 'employees', 'attendance', 'leave', 'master_data', 'reports', 'recruitment', 'roles', 'users', 'settings'];

  for (const moduleCode of premiumModuleCodes) {
    const orgModuleId = createdOrgModules[moduleCode];
    if (orgModuleId) {
      await prisma.organizationModule.upsert({
        where: {
          organizationId_orgModuleId: {
            organizationId: testOrg.id,
            orgModuleId: orgModuleId,
          },
        },
        update: {},
        create: {
          organizationId: testOrg.id,
          orgModuleId: orgModuleId,
          isEnabled: true,
        },
      });
    }
  }

  console.log('✅ Modules enabled (10 modules from Premium plan)\n');

  // ============================================
  // 6. DEFAULT ROLES FOR TEST ORG
  // ============================================
  console.log('🎭 Creating default roles for test organization...');

  // Organization Admin Role
  const orgAdminRole = await prisma.role.create({
    data: {
      organizationId: testOrg.id,
      name: 'Organization Admin',
      code: 'org_admin',
      description: 'Full access to all modules within the organization',
      isSystem: true,
      isActive: true,
    },
  });

  // Create permissions for Org Admin (full access to all enabled modules)
  for (const moduleCode of premiumModuleCodes) {
    const orgModuleId = createdOrgModules[moduleCode];
    await prisma.rolePermission.create({
      data: {
        roleId: orgAdminRole.id,
        moduleCode: moduleCode,
        orgModuleId: orgModuleId || null,
        canRead: true,
        canWrite: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
      },
    });
  }

  // HR Manager Role
  const hrManagerRole = await prisma.role.create({
    data: {
      organizationId: testOrg.id,
      name: 'HR Manager',
      code: 'hr_manager',
      description: 'Manage employees, attendance, leave, and recruitment',
      isSystem: true,
      isActive: true,
    },
  });

  // HR Manager permissions
  const hrModules = ['dashboard', 'employees', 'attendance', 'leave', 'recruitment', 'master_data', 'reports'];
  for (const moduleCode of hrModules) {
    const orgModuleId = createdOrgModules[moduleCode];
    await prisma.rolePermission.create({
      data: {
        roleId: hrManagerRole.id,
        moduleCode: moduleCode,
        orgModuleId: orgModuleId || null,
        canRead: true,
        canWrite: moduleCode !== 'reports',
        canUpdate: moduleCode !== 'reports',
        canDelete: moduleCode !== 'reports',
        canApprove: ['leave', 'recruitment'].includes(moduleCode),
        canExport: true,
      },
    });
  }

  // Manager Role
  const managerRole = await prisma.role.create({
    data: {
      organizationId: testOrg.id,
      name: 'Manager',
      code: 'manager',
      description: 'View employees, manage attendance and approve leave requests',
      isSystem: true,
      isActive: true,
    },
  });

  // Manager permissions
  await prisma.rolePermission.createMany({
    data: [
      { roleId: managerRole.id, moduleCode: 'dashboard', orgModuleId: createdOrgModules['dashboard'], canRead: true, canExport: false },
      { roleId: managerRole.id, moduleCode: 'employees', orgModuleId: createdOrgModules['employees'], canRead: true, canExport: true },
      { roleId: managerRole.id, moduleCode: 'attendance', orgModuleId: createdOrgModules['attendance'], canRead: true, canWrite: true, canUpdate: true, canExport: true },
      { roleId: managerRole.id, moduleCode: 'leave', orgModuleId: createdOrgModules['leave'], canRead: true, canWrite: true, canUpdate: true, canApprove: true, canExport: true },
      { roleId: managerRole.id, moduleCode: 'reports', orgModuleId: createdOrgModules['reports'], canRead: true, canExport: true },
    ],
  });

  // Employee Role
  const employeeRole = await prisma.role.create({
    data: {
      organizationId: testOrg.id,
      name: 'Employee',
      code: 'employee',
      description: 'Self-service access for employees',
      isSystem: true,
      isActive: true,
    },
  });

  // Employee permissions (limited)
  await prisma.rolePermission.createMany({
    data: [
      { roleId: employeeRole.id, moduleCode: 'dashboard', orgModuleId: createdOrgModules['dashboard'], canRead: true },
      { roleId: employeeRole.id, moduleCode: 'attendance', orgModuleId: createdOrgModules['attendance'], canRead: true }, // Own attendance only
      { roleId: employeeRole.id, moduleCode: 'leave', orgModuleId: createdOrgModules['leave'], canRead: true, canWrite: true }, // Apply for leave
    ],
  });

  console.log('✅ Default roles created\n');

  // ============================================
  // 7. TEST ORG ADMIN USER
  // ============================================
  console.log('👤 Creating test organization admin user...');

  const testOrgAdminPassword = await bcrypt.hash('Admin@123', 10);

  const testOrgAdmin = await prisma.user.create({
    data: {
      organizationId: testOrg.id,
      roleId: orgAdminRole.id,
      email: 'admin@democompany.com',
      passwordHash: testOrgAdminPassword,
      firstName: 'Demo',
      lastName: 'Admin',
      isSuperAdmin: false,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ Test org admin created');
  console.log('   📧 Email: admin@democompany.com');
  console.log('   🔑 Password: Admin@123\n');

  // ============================================
  // 8. SAMPLE MASTER DATA FOR TEST ORG
  // ============================================
  console.log('📋 Creating sample master data...');

  // Departments
  const hrDept = await prisma.department.create({
    data: {
      organizationId: testOrg.id,
      name: 'Human Resources',
      code: 'HR',
      isActive: true,
    },
  });

  const itDept = await prisma.department.create({
    data: {
      organizationId: testOrg.id,
      name: 'Information Technology',
      code: 'IT',
      isActive: true,
    },
  });

  const salesDept = await prisma.department.create({
    data: {
      organizationId: testOrg.id,
      name: 'Sales',
      code: 'SALES',
      isActive: true,
    },
  });

  // Designations
  await prisma.designation.createMany({
    data: [
      { organizationId: testOrg.id, name: 'Manager', code: 'MGR', level: 3, isActive: true },
      { organizationId: testOrg.id, name: 'Senior Executive', code: 'SR_EXEC', level: 2, isActive: true },
      { organizationId: testOrg.id, name: 'Executive', code: 'EXEC', level: 1, isActive: true },
      { organizationId: testOrg.id, name: 'Intern', code: 'INTERN', level: 0, isActive: true },
    ],
  });

  // Employment Types
  await prisma.employmentType.createMany({
    data: [
      { organizationId: testOrg.id, name: 'Full-time', code: 'FT', isActive: true },
      { organizationId: testOrg.id, name: 'Part-time', code: 'PT', isActive: true },
      { organizationId: testOrg.id, name: 'Contract', code: 'CONTRACT', isActive: true },
      { organizationId: testOrg.id, name: 'Intern', code: 'INTERN', isActive: true },
    ],
  });

  // Branches
  await prisma.branch.createMany({
    data: [
      {
        organizationId: testOrg.id,
        name: 'Mumbai Head Office',
        code: 'MUM_HO',
        address: '123 Business Park, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400069',
        phone: '+91 22 12345678',
        email: 'mumbai@democompany.com',
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        name: 'Delhi Branch',
        code: 'DEL_BR',
        address: '456 Corporate Tower, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
        phone: '+91 11 87654321',
        email: 'delhi@democompany.com',
        isActive: true,
      },
    ],
  });

  // Leave Types
  await prisma.leaveType.createMany({
    data: [
      {
        organizationId: testOrg.id,
        name: 'Casual Leave',
        code: 'CL',
        description: 'For short-term personal needs',
        daysPerYear: 12,
        isPaid: true,
        requiresApproval: true,
        maxConsecutiveDays: 3,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        name: 'Sick Leave',
        code: 'SL',
        description: 'For medical reasons',
        daysPerYear: 7,
        isPaid: true,
        requiresApproval: true,
        maxConsecutiveDays: 5,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        name: 'Privilege Leave',
        code: 'PL',
        description: 'Annual vacation leave',
        daysPerYear: 21,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
      },
    ],
  });

  // Get created departments and designations for organizational positions
  const manager = await prisma.designation.findFirst({
    where: { organizationId: testOrg.id, code: 'MGR' },
  });
  const seniorExec = await prisma.designation.findFirst({
    where: { organizationId: testOrg.id, code: 'SR_EXEC' },
  });
  const executive = await prisma.designation.findFirst({
    where: { organizationId: testOrg.id, code: 'EXEC' },
  });

  // Organizational Positions
  const hrManager = await prisma.organizationalPosition.create({
    data: {
      organizationId: testOrg.id,
      title: 'HR Manager',
      code: 'HR-MGR-01',
      description: 'Manages Human Resources department',
      departmentId: hrDept.id,
      designationId: manager!.id,
      headCount: 1,
      isActive: true,
    },
  });

  const itManager = await prisma.organizationalPosition.create({
    data: {
      organizationId: testOrg.id,
      title: 'IT Manager',
      code: 'IT-MGR-01',
      description: 'Manages Information Technology department',
      departmentId: itDept.id,
      designationId: manager!.id,
      headCount: 1,
      isActive: true,
    },
  });

  const salesManager = await prisma.organizationalPosition.create({
    data: {
      organizationId: testOrg.id,
      title: 'Sales Manager',
      code: 'SALES-MGR-01',
      description: 'Manages Sales department',
      departmentId: salesDept.id,
      designationId: manager!.id,
      headCount: 1,
      isActive: true,
    },
  });

  await prisma.organizationalPosition.createMany({
    data: [
      {
        organizationId: testOrg.id,
        title: 'HR Executive',
        code: 'HR-EXEC-01',
        description: 'HR Operations',
        departmentId: hrDept.id,
        designationId: executive!.id,
        reportingPositionId: hrManager.id,
        headCount: 2,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        title: 'Software Developer',
        code: 'IT-DEV-01',
        description: 'Software Development',
        departmentId: itDept.id,
        designationId: seniorExec!.id,
        reportingPositionId: itManager.id,
        headCount: 5,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        title: 'Sales Executive',
        code: 'SALES-EXEC-01',
        description: 'Sales Operations',
        departmentId: salesDept.id,
        designationId: executive!.id,
        reportingPositionId: salesManager.id,
        headCount: 3,
        isActive: true,
      },
    ],
  });

  // Job Positions (Recruitment)
  await prisma.jobPosition.createMany({
    data: [
      {
        organizationId: testOrg.id,
        title: 'Senior Full Stack Developer',
        code: 'JOB-2024-001',
        description: 'We are looking for an experienced Full Stack Developer to join our IT team',
        departmentId: itDept.id,
        requiredSkills: 'React, Node.js, TypeScript, PostgreSQL, Docker',
        requiredQualifications: "Bachelor's degree in Computer Science or related field",
        minExperience: 3,
        maxExperience: 7,
        vacancies: 2,
        priority: 'High',
        status: 'Open',
        postedDate: new Date(),
        closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        organizationId: testOrg.id,
        title: 'HR Executive',
        code: 'JOB-2024-002',
        description: 'Looking for an HR Executive to support recruitment and employee management',
        departmentId: hrDept.id,
        requiredSkills: 'Recruitment, Employee Relations, Communication',
        requiredQualifications: "Bachelor's degree in HR or related field",
        minExperience: 1,
        maxExperience: 3,
        vacancies: 1,
        priority: 'Medium',
        status: 'Open',
        postedDate: new Date(),
        closingDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      },
      {
        organizationId: testOrg.id,
        title: 'Sales Manager',
        code: 'JOB-2024-003',
        description: 'Experienced Sales Manager to lead our sales team',
        departmentId: salesDept.id,
        requiredSkills: 'Team Management, B2B Sales, Negotiation, Client Relations',
        requiredQualifications: "Bachelor's degree in Business or related field",
        minExperience: 5,
        maxExperience: 10,
        vacancies: 1,
        priority: 'High',
        status: 'Open',
        postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        closingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      },
      {
        organizationId: testOrg.id,
        title: 'Marketing Intern',
        code: 'JOB-2024-004',
        description: 'Internship opportunity for marketing students',
        requiredSkills: 'Social Media, Content Writing, Basic Analytics',
        requiredQualifications: 'Pursuing degree in Marketing or related field',
        minExperience: 0,
        maxExperience: 0,
        vacancies: 2,
        priority: 'Low',
        status: 'On Hold',
        postedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    ],
  });

  // Holidays (2025 Calendar)
  await prisma.holiday.createMany({
    data: [
      // National Holidays
      {
        organizationId: testOrg.id,
        date: new Date('2025-01-26'),
        name: 'Republic Day',
        description: 'Republic Day of India',
        type: 'National',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-08-15'),
        name: 'Independence Day',
        description: 'Independence Day of India',
        type: 'National',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-10-02'),
        name: 'Gandhi Jayanti',
        description: 'Birthday of Mahatma Gandhi',
        type: 'National',
        isOptional: false,
        isActive: true,
      },
      // Religious Holidays
      {
        organizationId: testOrg.id,
        date: new Date('2025-03-14'),
        name: 'Holi',
        description: 'Festival of Colors',
        type: 'Religious',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-03-31'),
        name: 'Eid ul-Fitr',
        description: 'Islamic festival',
        type: 'Religious',
        isOptional: true,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-10-22'),
        name: 'Dussehra',
        description: 'Victory of good over evil',
        type: 'Religious',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-11-01'),
        name: 'Diwali',
        description: 'Festival of Lights',
        type: 'Religious',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-12-25'),
        name: 'Christmas',
        description: 'Christmas Day',
        type: 'Religious',
        isOptional: true,
        isActive: true,
      },
      // Company Holidays
      {
        organizationId: testOrg.id,
        date: new Date('2025-01-01'),
        name: 'New Year\'s Day',
        description: 'Start of new year',
        type: 'Company',
        isOptional: false,
        isActive: true,
      },
      {
        organizationId: testOrg.id,
        date: new Date('2025-12-31'),
        name: 'New Year\'s Eve',
        description: 'End of year celebration',
        type: 'Company',
        isOptional: true,
        isActive: true,
      },
    ],
  });

  console.log('✅ Sample master data created\n');

  console.log('════════════════════════════════════════');
  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📝 Summary:');
  console.log('   • 3 Subscription Plans (Basic, Premium, Enterprise)');
  console.log('   • 8 Platform Modules (SuperAdmin)');
  console.log('   • 11 Org Modules (Tenant)');
  console.log('   • Plan-Module Links:');
  console.log('     - Basic: 9 modules (core only)');
  console.log('     - Premium: 10 modules (core + recruitment)');
  console.log('     - Enterprise: 11 modules (all)');
  console.log('   • 1 Super Admin User');
  console.log('   • 1 Test Organization (demo-company)');
  console.log('   • 4 Default Roles (Org Admin, HR Manager, Manager, Employee)');
  console.log('   • 1 Test Org Admin User');
  console.log('   • Sample Master Data\n');

  console.log('🔐 Login Credentials:\n');
  console.log('   Super Admin:');
  console.log('   📧 Email: superadmin@kalsohr.com');
  console.log('   🔑 Password: Admin@123\n');

  console.log('   Test Organization Admin:');
  console.log('   🏢 Organization: demo-company');
  console.log('   📧 Email: admin@democompany.com');
  console.log('   🔑 Password: Admin@123\n');

  console.log('🚀 Ready to start development!');
  console.log('════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
