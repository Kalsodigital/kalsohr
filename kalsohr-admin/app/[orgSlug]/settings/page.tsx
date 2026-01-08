'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, User, ChevronRight } from 'lucide-react';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { PageLoader } from '@/components/ui/page-loader';

interface SettingsSection {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  iconBgColor: string;
  moduleCode: string;
  permissionType: 'canRead' | 'canUpdate';
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading } = useOrgPermissions();

  const settingsSections: SettingsSection[] = [
    {
      title: 'Organization Settings',
      description: 'Configure timezone and other organization-wide settings',
      icon: Globe,
      href: `/${orgSlug}/settings/organization`,
      iconBgColor: 'bg-blue-600',
      moduleCode: 'settings',
      permissionType: 'canRead',
    },
    {
      title: 'Profile',
      description: 'View organization profile, subscription details, and usage statistics',
      icon: User,
      href: `/${orgSlug}/settings/profile`,
      iconBgColor: 'bg-purple-600',
      moduleCode: 'settings',
      permissionType: 'canRead',
    },
  ];

  if (isLoading) {
    return <PageLoader />;
  }

  // Filter sections based on permissions
  const visibleSections = settingsSections.filter((section) =>
    hasPermission(section.moduleCode, section.permissionType)
  );

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
              onClick={() => router.push(section.href)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${section.iconBgColor} flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {section.title}
                      </CardTitle>
                      <CardDescription className="mt-2 text-sm">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {visibleSections.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          You don't have permission to access any settings sections.
        </div>
      )}
    </div>
  );
}
