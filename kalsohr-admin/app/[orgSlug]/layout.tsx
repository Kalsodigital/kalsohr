'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { OrgSidebar } from '@/components/layout/org-sidebar';
import { ImpersonationBanner } from '@/components/ui/impersonation-banner';
import { OrgThemeProvider } from '@/components/theme/org-theme-provider';

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { user, isAuthenticated, refreshUserData, impersonatedOrg } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());

  // Wait for Zustand to rehydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Refresh user data immediately on mount to ensure fresh permissions
  useEffect(() => {
    if (!isHydrated || !user?.role) return;

    // Only refresh once per session (use sessionStorage to track)
    const hasRefreshedThisSession = sessionStorage.getItem('orgPermissionsRefreshed');
    if (hasRefreshedThisSession) return;

    const refreshData = async () => {
      try {
        await refreshUserData();
        sessionStorage.setItem('orgPermissionsRefreshed', 'true');
        lastRefreshRef.current = Date.now();
      } catch (error) {
        console.error('Failed to refresh user data on mount:', error);
      }
    };

    refreshData();
  }, [isHydrated, user?.role, refreshUserData]);

  useEffect(() => {
    if (!isHydrated) return; // Don't check auth until hydrated

    // Redirect to unified login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Allow super admins when impersonating
    const isImpersonating = user?.isSuperAdmin && impersonatedOrg;

    // Block super admins from accessing org portal UNLESS they're impersonating
    if (user?.isSuperAdmin && !isImpersonating) {
      router.push('/superadmin/organizations');
      return;
    }

    // Validate user belongs to this organization OR is impersonating this org
    const hasAccess = isImpersonating
      ? impersonatedOrg.slug === orgSlug
      : user?.organization?.slug === orgSlug;

    if (!hasAccess) {
      if (isImpersonating) {
        router.push('/superadmin/organizations');
      } else {
        router.push(`/${user?.organization?.slug || 'unauthorized'}/dashboard`);
      }
      return;
    }
  }, [isHydrated, isAuthenticated, user, orgSlug, router, impersonatedOrg]);

  // Refresh permissions when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = async () => {
      // Only refresh if it's been more than 5 seconds since last refresh
      const now = Date.now();
      if (now - lastRefreshRef.current < 5000) return;

      if (user?.role) {
        try {
          await refreshUserData();
          lastRefreshRef.current = now;
        } catch (error) {
          console.error('Failed to refresh user data on focus:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, refreshUserData]);

  // Poll for permission updates every 30 seconds
  useEffect(() => {
    if (!user?.role) return;

    const interval = setInterval(async () => {
      try {
        await refreshUserData();
        lastRefreshRef.current = Date.now();
      } catch (error) {
        console.error('Failed to refresh user data (polling):', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, refreshUserData]);

  // Show loading until hydrated
  if (!isHydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has access (either belongs to org or is impersonating)
  const isImpersonating = user.isSuperAdmin && impersonatedOrg;
  const hasAccess = isImpersonating
    ? impersonatedOrg.slug === orgSlug
    : user.organization?.slug === orgSlug;

  // Show access denied if no access
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access this organization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OrgThemeProvider>
      <div className="flex min-h-screen bg-gray-50">
        <OrgSidebar />
        <main className="flex-1 lg:ml-72 overflow-auto">
          <ImpersonationBanner />
          <div className="container mx-auto px-6 py-8 lg:px-12 xl:px-16">
            {children}
          </div>
        </main>
      </div>
    </OrgThemeProvider>
  );
}
