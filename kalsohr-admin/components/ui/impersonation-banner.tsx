'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const router = useRouter();
  const { impersonatedOrg, stopImpersonation } = useAuthStore();

  // Don't show banner if not impersonating
  if (!impersonatedOrg) {
    return null;
  }

  const handleExitImpersonation = () => {
    stopImpersonation();
    toast.success('Exited organization view');
    router.push('/superadmin/organizations');
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">
                Support Mode: Viewing as {impersonatedOrg.name}
              </p>
              <p className="text-xs opacity-90">
                You are viewing this organization's data. Changes you make will be logged.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExitImpersonation}
            className="bg-white text-red-600 hover:bg-gray-100 font-semibold"
          >
            <X className="w-4 h-4 mr-2" />
            Exit Organization View
          </Button>
        </div>
      </div>
    </div>
  );
}
