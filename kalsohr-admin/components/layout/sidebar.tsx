'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Database,
  Globe,
  MapPin,
  ChevronDown,
  ChevronRight,
  Droplet,
  Heart,
  Church,
  GraduationCap,
  FileText,
  CreditCard,
  Factory,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
  moduleCode?: string; // Module code for permission checking
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { hasAnyPermission, isSuperAdmin } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);

  // Auto-expand Masters dropdown if on a masters page
  useEffect(() => {
    if (pathname.startsWith('/superadmin/masters')) {
      setIsMastersOpen(true);
    }
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: '/superadmin/organizations',
      label: 'Organizations',
      icon: <Building2 className="w-5 h-5" />,
      superAdminOnly: true,
      moduleCode: 'organizations',
    },
    {
      href: '/superadmin/subscription-plans',
      label: 'Subscription Plans',
      icon: <CreditCard className="w-5 h-5" />,
      superAdminOnly: true,
      moduleCode: 'subscription_plans',
    },
    {
      href: '/superadmin/users',
      label: 'Users',
      icon: <Users className="w-5 h-5" />,
      superAdminOnly: true,
      moduleCode: 'accounts',
    },
    {
      href: '/superadmin/roles',
      label: 'Roles & Permissions',
      icon: <Shield className="w-5 h-5" />,
      superAdminOnly: true,
      moduleCode: 'platform_roles',
    },
  ];

  // Masters submenu (only for super admin)
  const mastersItems: NavItem[] = [
    {
      href: '/superadmin/masters/countries',
      label: 'Countries',
      icon: <Globe className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/states',
      label: 'States / UTs',
      icon: <MapPin className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/cities',
      label: 'Cities',
      icon: <Building2 className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/blood-groups',
      label: 'Blood Groups',
      icon: <Droplet className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/genders',
      label: 'Genders',
      icon: <Users className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/marital-status',
      label: 'Marital Status',
      icon: <Heart className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/religions',
      label: 'Religions',
      icon: <Church className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/education-levels',
      label: 'Education Levels',
      icon: <GraduationCap className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/document-types',
      label: 'Document Types',
      icon: <FileText className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/organization-types',
      label: 'Organization Types',
      icon: <Building2 className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/industry-types',
      label: 'Industry Types',
      icon: <Factory className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
    {
      href: '/superadmin/masters/business-categories',
      label: 'Business Categories',
      icon: <BarChart3 className="w-4 h-4" />,
      superAdminOnly: true,
      moduleCode: 'master_data',
    },
  ];

  // Check if user has access to any masters items
  const hasMastersAccess = isSuperAdmin && hasAnyPermission('master_data');

  // Filter nav items based on user role and permissions
  const filteredNavItems = navItems.filter((item) => {
    // Dashboard is always visible
    if (item.href === '/dashboard') {
      return true;
    }

    // Super admin only items
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
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
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
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
        {/* Logo */}
        <div className="h-20 px-6 flex items-center border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              KalsoHR
            </h1>
            {user?.isSuperAdmin && (
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Super Admin Panel</p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1">
            {/* Dashboard */}
            {filteredNavItems
              .filter((item) => item.href === '/dashboard')
              .map((item) => {
                const isActive = pathname === item.href || pathname === '/superadmin/dashboard';
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

            {/* Masters Dropdown (Super Admin Only) */}
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

            {/* Other Navigation Items */}
            {filteredNavItems
              .filter((item) => item.href !== '/dashboard')
              .map((item) => {
                const isActive = pathname === item.href;
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
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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
