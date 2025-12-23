'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Building2,
  Users,
  Briefcase,
  HardDrive,
  Grid3x3,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Edit,
  Palette,
} from 'lucide-react';
import { getOrganizationProfile } from '@/lib/api/org/organization';
import { OrganizationProfileData } from '@/lib/types/organization';
import { toast } from 'sonner';
import { EditProfileDialog } from './edit-profile-dialog';

interface StatCardProps {
  icon: any;
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'purple' | 'indigo';
}

const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
};

export default function OrganizationProfilePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [profileData, setProfileData] = useState<OrganizationProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getOrganizationProfile(orgSlug);
      setProfileData(data);
    } catch (error) {
      console.error('Failed to fetch organization profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) {
      fetchProfile();
    }
  }, [orgSlug]);

  const handleEditSuccess = () => {
    fetchProfile(); // Refresh data after successful edit
  };

  if (loading) {
    return <PageLoader message="Loading organization profile..." />;
  }

  if (!profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load organization profile</p>
      </div>
    );
  }

  const { organization, statistics } = profileData;

  return (
    <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-6">
            {/* Organization Logo */}
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex-shrink-0 shadow-lg">
              {organization.logo ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${organization.logo}`}
                  alt={organization.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-4xl font-bold">
                  {organization.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Organization Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{organization.name}</h1>
              <div className="flex items-center gap-3 text-gray-600">
                {organization.industryType && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {organization.industryType.name}
                  </span>
                )}
                {organization.organizationType && (
                  <>
                    {organization.industryType && <span>•</span>}
                    <span>{organization.organizationType.name}</span>
                  </>
                )}
              </div>
              {organization.subscriptionPlan && (
                <div className="mt-3">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    {organization.subscriptionPlan.name} Plan
                  </Badge>
                </div>
              )}
            </div>

            {/* Edit Button */}
            <Button
              size="lg"
              onClick={() => setIsEditDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Statistics Cards - 4 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={statistics.totalUsers}
            color="blue"
          />
          <StatCard
            icon={Briefcase}
            label="Total Employees"
            value={statistics.totalEmployees}
            color="green"
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={`${statistics.storageUsedMb} MB`}
            color="purple"
          />
          <StatCard
            icon={Grid3x3}
            label="Enabled Modules"
            value={statistics.enabledModulesCount}
            color="indigo"
          />
        </div>

        {/* Information Grid - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information Card */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Mail className="w-5 h-5 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-gray-900 font-medium">{organization.email}</p>
              </div>
              {organization.phone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-gray-900 font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {organization.phone}
                  </p>
                </div>
              )}
              {organization.address && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="text-gray-900">{organization.address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {[
                    organization.city?.name,
                    organization.state?.name,
                    organization.country?.name,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Not specified'}
                </p>
                {organization.postalCode && (
                  <p className="text-sm text-gray-600 ml-6">Postal Code: {organization.postalCode}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details Card (READ-ONLY) */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization.subscriptionPlan && (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Plan</p>
                    <p className="text-gray-900 font-semibold text-lg">
                      {organization.subscriptionPlan.name}
                    </p>
                  </div>
                  {organization.subscriptionTenure && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Billing</p>
                      <p className="text-gray-900 capitalize">{organization.subscriptionTenure}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Start Date</p>
                      <p className="text-gray-900 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(organization.subscriptionStartDate).toLocaleDateString()}
                      </p>
                    </div>
                    {organization.subscriptionExpiryDate && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                        <p className="text-gray-900 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(organization.subscriptionExpiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">Plan Limits</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Users:</span>
                        <span className="font-medium text-gray-900">
                          {organization.subscriptionPlan.maxUsers || 'Unlimited'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Employees:</span>
                        <span className="font-medium text-gray-900">
                          {organization.subscriptionPlan.maxEmployees || 'Unlimited'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Storage:</span>
                        <span className="font-medium text-gray-900">
                          {organization.subscriptionPlan.maxStorageMb
                            ? `${organization.subscriptionPlan.maxStorageMb} MB`
                            : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Classification Card */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Organization Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Organization Type</p>
                <p className="text-gray-900 font-medium">
                  {organization.organizationType?.name || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Industry</p>
                <p className="text-gray-900 font-medium">
                  {organization.industryType?.name || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Business Category</p>
                <p className="text-gray-900 font-medium">
                  {organization.businessCategory?.name || 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Theme Customization Card */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Palette className="w-5 h-5 text-pink-600" />
                Theme Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Brand Colors</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Primary Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: organization.themePrimaryColor || '#3B82F6' }}
                      />
                      <span className="text-xs font-mono text-gray-600">
                        {organization.themePrimaryColor || '#3B82F6'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Secondary Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: organization.themeSecondaryColor || '#8B5CF6' }}
                      />
                      <span className="text-xs font-mono text-gray-600">
                        {organization.themeSecondaryColor || '#8B5CF6'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Accent Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{ backgroundColor: organization.themeAccentColor || '#EC4899' }}
                      />
                      <span className="text-xs font-mono text-gray-600">
                        {organization.themeAccentColor || '#EC4899'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  These colors will be used for future branding features
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          organization={organization}
          orgSlug={orgSlug}
          onSuccess={handleEditSuccess}
        />
      </div>
  );
}
