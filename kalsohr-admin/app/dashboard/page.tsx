'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for auth store to finish loading
    if (isLoading) return;

    // If no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect based on user type
    if (user.isSuperAdmin) {
      // Super admin goes to super admin dashboard
      router.replace('/superadmin/dashboard');
    } else if (user.organization?.slug) {
      // Organization user goes to their org dashboard
      router.replace(`/${user.organization.slug}/dashboard`);
    } else {
      // Fallback to login if no organization
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
