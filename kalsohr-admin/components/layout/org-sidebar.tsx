'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  UserCog,
  Building2,
  Briefcase,
  Award,
  FileText,
  MapPin,
  Calendar,
  Database,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  moduleCode?: string;
}

export function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const { user, logout } = useAuthStore();
  const { hasAnyPermission, organization } = useOrgPermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);

  // Auto-expand Masters dropdown if on a masters page
  useEffect(() => {
    if (pathname.includes('/masters/')) {
      setIsMastersOpen(true);
    }
  }, [pathname]);

  // Auto-expand Recruitment dropdown if on a recruitment page
  useEffect(() => {
    if (pathname.includes('/recruitment/')) {
      setIsRecruitmentOpen(true);
    }
  }, [pathname]);

  // Main navigation items for organization portal
  const navItems: NavItem[] = [
    {
      href: `/${orgSlug}/dashboard`,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      moduleCode: 'dashboard',
    },
    {
      href: `/${orgSlug}/employees`,
      label: 'Employees',
      icon: <UserCog className="w-5 h-5" />,
      moduleCode: 'employees',
    },
    {
      href: `/${orgSlug}/roles`,
      label: 'Roles & Permissions',
      icon: <Shield className="w-5 h-5" />,
      moduleCode: 'roles',
    },
    {
      href: `/${orgSlug}/users`,
      label: 'Users',
      icon: <Users className="w-5 h-5" />,
      moduleCode: 'users',
    },
  ];

  // Recruitment submenu items
  const recruitmentItems: NavItem[] = [
    {
      href: `/${orgSlug}/recruitment/candidates`,
      label: 'Candidates',
      icon: <Users className="w-4 h-4" />,
      moduleCode: 'recruitment',
    },
    {
      href: `/${orgSlug}/recruitment/applications`,
      label: 'Applications',
      icon: <FileText className="w-4 h-4" />,
      moduleCode: 'recruitment',
    },
    {
      href: `/${orgSlug}/recruitment/interviews`,
      label: 'Interviews',
      icon: <Calendar className="w-4 h-4" />,
      moduleCode: 'recruitment',
    },
  ];

  // Masters submenu items
  const mastersItems: NavItem[] = [
    {
      href: `/${orgSlug}/masters/departments`,
      label: 'Departments',
      icon: <Briefcase className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/designations`,
      label: 'Designations',
      icon: <Award className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/organizational-positions`,
      label: 'Org Positions',
      icon: <Building2 className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/employment-types`,
      label: 'Employment Types',
      icon: <FileText className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/branches`,
      label: 'Branches',
      icon: <MapPin className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/leave-types`,
      label: 'Leave Types',
      icon: <Calendar className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/job-positions`,
      label: 'Job Positions',
      icon: <Users className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
    {
      href: `/${orgSlug}/masters/holidays`,
      label: 'Holidays',
      icon: <Calendar className="w-4 h-4" />,
      moduleCode: 'master_data',
    },
  ];

  // Settings item
  const settingsItem: NavItem = {
    href: `/${orgSlug}/settings`,
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    moduleCode: 'settings',
  };

  // Check if user has access to recruitment
  const hasRecruitmentAccess = hasAnyPermission('recruitment');

  // Check if user has access to masters
  const hasMastersAccess = hasAnyPermission('master_data');

  // Filter nav items based on user permissions
  const filteredNavItems = navItems.filter((item) => {
    // Dashboard is always visible
    if (item.moduleCode === 'dashboard') {
      return true;
    }

    // Check module permissions if moduleCode is specified
    if (item.moduleCode) {
      return hasAnyPermission(item.moduleCode);
    }

    return true;
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-5 left-5 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-white shadow-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200
          transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-72 flex flex-col
        `}
      >
        {/* Logo & Organization */}
        <div className="h-20 px-6 flex items-center border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-[180px]">
                {organization?.name || 'Organization'}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1">
            {/* Main Navigation Items */}
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Recruitment Dropdown */}
            {hasRecruitmentAccess && (
              <div className="space-y-1">
                {/* Recruitment Toggle Button */}
                <button
                  onClick={() => setIsRecruitmentOpen(!isRecruitmentOpen)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    <span>Recruitment</span>
                  </div>
                  {isRecruitmentOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Recruitment Submenu */}
                {isRecruitmentOpen && (
                  <div className="ml-4 space-y-1">
                    {recruitmentItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`
                            flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                            transition-all duration-200
                            ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Masters Dropdown */}
            {hasMastersAccess && (
              <div className="space-y-1">
                {/* Masters Toggle Button */}
                <button
                  onClick={() => setIsMastersOpen(!isMastersOpen)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-500" />
                    <span>Masters</span>
                  </div>
                  {isMastersOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Masters Submenu */}
                {isMastersOpen && (
                  <div className="ml-4 space-y-1">
                    {mastersItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`
                            flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                            transition-all duration-200
                            ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            {hasAnyPermission(settingsItem.moduleCode!) && (
              <Link
                href={settingsItem.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${
                    pathname === settingsItem.href || pathname.startsWith(settingsItem.href + '/')
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className={pathname === settingsItem.href ? 'text-blue-600' : 'text-gray-500'}>
                  {settingsItem.icon}
                </span>
                <span>{settingsItem.label}</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role?.name || 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
