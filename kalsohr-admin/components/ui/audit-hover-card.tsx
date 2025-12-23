import { ReactNode } from 'react';
import { format } from 'date-fns';
import { User, Clock, Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useOrgPermissions } from '@/lib/hooks/useOrgPermissions';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface UserInfo {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface AuditHoverCardProps {
  children: ReactNode;
  createdAt: string | Date;
  createdBy?: number | null;
  creator?: UserInfo | null;
  updatedAt: string | Date;
  updatedBy?: number | null;
  updater?: UserInfo | null;
}

/**
 * Hover card component to display audit information on hover
 *
 * Usage:
 * ```tsx
 * <AuditHoverCard
 *   createdAt={item.createdAt}
 *   creator={item.creator}
 *   updatedAt={item.updatedAt}
 *   updater={item.updater}
 * >
 *   <span className="cursor-help">{item.name}</span>
 * </AuditHoverCard>
 * ```
 */
export function AuditHoverCard({
  children,
  createdAt,
  createdBy,
  creator,
  updatedAt,
  updatedBy,
  updater,
}: AuditHoverCardProps) {
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy h:mm a');
  };

  const getUserName = (user?: UserInfo | null) => {
    if (!user) return 'Unknown User';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email;
  };

  const wasUpdated = new Date(updatedAt).getTime() !== new Date(createdAt).getTime();

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Info className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="font-semibold text-gray-900">Record History</h4>
          </div>

          {/* Created Info */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Created
                  </span>
                </div>
                <div className="text-sm text-gray-900 font-medium mb-1">
                  {formatDate(createdAt)}
                </div>
                {creator && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">by</span>
                    <span className="text-xs font-medium text-gray-700">
                      {getUserName(creator)}
                    </span>
                  </div>
                )}
                {!creator && createdBy && (
                  <span className="text-xs text-gray-400">User ID: {createdBy}</span>
                )}
              </div>
            </div>
          </div>

          {/* Updated Info - Only show if different from created */}
          {wasUpdated && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      Last Updated
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium mb-1">
                    {formatDate(updatedAt)}
                  </div>
                  {updater && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">by</span>
                      <span className="text-xs font-medium text-gray-700">
                        {getUserName(updater)}
                      </span>
                    </div>
                  )}
                  {!updater && updatedBy && (
                    <span className="text-xs text-gray-400">User ID: {updatedBy}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!wasUpdated && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">No updates yet</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Simple icon trigger for audit hover card (for compact use in tables)
 * Only shows if user has approve permission for the module
 */
export function AuditHoverIcon({
  createdAt,
  createdBy,
  creator,
  updatedAt,
  updatedBy,
  updater,
  moduleCode,
  className = '',
}: Omit<AuditHoverCardProps, 'children'> & {
  moduleCode: string;
  className?: string;
}) {
  const pathname = usePathname();
  // Determine if it's an org page (not superadmin, login, or root)
  const isOrgPage = !pathname?.startsWith('/superadmin') && pathname !== '/login' && pathname !== '/';

  // Use appropriate permission hook based on page type
  const orgPermissions = useOrgPermissions();
  const superAdminPermissions = usePermissions();

  const hasApprovePermission = isOrgPage
    ? orgPermissions.hasPermission(moduleCode, 'canApprove')
    : superAdminPermissions.hasPermission(moduleCode, 'canApprove');

  // Only show if we have audit data AND user has approve permission
  if (!creator && !updater && !createdBy && !updatedBy) {
    return null;
  }

  if (!hasApprovePermission) {
    return null;
  }

  return (
    <AuditHoverCard
      createdAt={createdAt}
      createdBy={createdBy}
      creator={creator}
      updatedAt={updatedAt}
      updatedBy={updatedBy}
      updater={updater}
    >
      <div
        className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors ${className}`}
      >
        <Info className="w-3 h-3 text-gray-600 hover:text-gray-700 transition-colors" />
      </div>
    </AuditHoverCard>
  );
}
