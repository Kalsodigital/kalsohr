'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Clock,
  Save,
  Info,
} from 'lucide-react';
import { getOrganizationProfile, updateOrganizationSettings } from '@/lib/api/org/organization';
import { OrganizationProfileData } from '@/lib/types/organization';
import { toast } from 'sonner';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Kolkata (IST - India)', value: 'Asia/Kolkata' },
  { label: 'Asia/Dubai (UAE)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (Japan)', value: 'Asia/Tokyo' },
  { label: 'Asia/Shanghai (China)', value: 'Asia/Shanghai' },
  { label: 'Asia/Hong_Kong', value: 'Asia/Hong_Kong' },
  { label: 'Asia/Jakarta (Indonesia)', value: 'Asia/Jakarta' },
  { label: 'Asia/Seoul (South Korea)', value: 'Asia/Seoul' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Europe/Berlin (Germany)', value: 'Europe/Berlin' },
  { label: 'Europe/Moscow (Russia)', value: 'Europe/Moscow' },
  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
  { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'America/Denver (MST/MDT)', value: 'America/Denver' },
  { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'America/Toronto (Canada - Eastern)', value: 'America/Toronto' },
  { label: 'America/Mexico_City', value: 'America/Mexico_City' },
  { label: 'America/Sao_Paulo (Brazil)', value: 'America/Sao_Paulo' },
  { label: 'Pacific/Auckland (New Zealand)', value: 'Pacific/Auckland' },
];

export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const { hasPermission, isLoading: permissionLoading } = useOrgPermissions();
  const canUpdate = hasPermission('settings', 'canUpdate');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<OrganizationProfileData | null>(null);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [orgSlug]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const data = await getOrganizationProfile(orgSlug);
      setProfileData(data);
      setTimezone(data.organization.timezone || 'UTC');
    } catch (error) {
      console.error('Failed to load organization data:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(value !== (profileData?.organization.timezone || 'UTC'));
  };

  const handleSave = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update organization settings');
      return;
    }

    try {
      setSaving(true);
      await updateOrganizationSettings(orgSlug, { timezone });
      toast.success('Organization settings updated successfully');
      setHasChanges(false);
      // Reload to get fresh data
      await loadOrganizationData();
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTimezone(profileData?.organization.timezone || 'UTC');
    setHasChanges(false);
  };

  const getCurrentTime = () => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date());
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  if (loading || permissionLoading) {
    return <PageLoader />;
  }

  if (!profileData) {
    return (
      <div className="p-8 text-center text-gray-500">
        Organization not found
      </div>
    );
  }

  const organization = profileData.organization;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-600" />
          Organization Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Configure timezone and other organization-wide settings
        </p>
      </div>

      {/* Timezone Settings Card */}
      <Card className="mb-6">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Timezone Settings</CardTitle>
              <CardDescription className="mt-1">
                Set the default timezone for your organization. This affects how dates and times are displayed throughout the system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Timezone Selector */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
                Timezone
              </Label>
              <Select
                value={timezone}
                onValueChange={handleTimezoneChange}
                disabled={!canUpdate}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Time Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    Current time in selected timezone:
                  </div>
                  <div className="text-sm text-blue-700 font-mono">
                    {getCurrentTime()}
                  </div>
                </div>
              </div>
            </div>

            {/* Information Alert */}
            {hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    You have unsaved changes. Click "Save Changes" to apply the new timezone setting.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canUpdate && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={!hasChanges || saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Info Card (Read-only) */}
      <Card>
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <CardTitle>Organization Information</CardTitle>
          <CardDescription className="mt-1">
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm text-gray-600">Organization Name</Label>
              <div className="mt-1 text-sm font-medium text-gray-900">{organization.name}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Organization Code</Label>
              <div className="mt-1 text-sm font-medium text-gray-900">{organization.code}</div>
            </div>
            {organization.email && (
              <div>
                <Label className="text-sm text-gray-600">Email</Label>
                <div className="mt-1 text-sm font-medium text-gray-900">{organization.email}</div>
              </div>
            )}
            {organization.phone && (
              <div>
                <Label className="text-sm text-gray-600">Phone</Label>
                <div className="mt-1 text-sm font-medium text-gray-900">{organization.phone}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
