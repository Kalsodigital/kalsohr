import { format } from 'date-fns';
import { User, Clock } from 'lucide-react';

interface UserInfo {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface AuditInfoProps {
  createdAt: string | Date;
  createdBy?: number | null;
  creator?: UserInfo | null;
  updatedAt: string | Date;
  updatedBy?: number | null;
  updater?: UserInfo | null;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Reusable component to display audit information (created/updated by and when)
 *
 * Usage:
 * ```tsx
 * <AuditInfo
 *   createdAt={department.createdAt}
 *   creator={department.creator}
 *   updatedAt={department.updatedAt}
 *   updater={department.updater}
 * />
 * ```
 */
export function AuditInfo({
  createdAt,
  creator,
  updatedAt,
  updater,
  className = '',
  variant = 'default',
}: AuditInfoProps) {
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy h:mm a');
  };

  const getUserName = (user?: UserInfo | null) => {
    if (!user) return 'Unknown';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 text-xs text-gray-500 ${className}`}>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Created: {formatDate(createdAt)}</span>
        </div>
        {updatedAt !== createdAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Updated: {formatDate(updatedAt)}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-start gap-3 text-sm">
          <User className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="font-medium text-gray-700">Created</div>
            <div className="text-gray-600">{formatDate(createdAt)}</div>
            {creator && (
              <div className="text-xs text-gray-500 mt-1">
                by {getUserName(creator)}
              </div>
            )}
          </div>
        </div>

        {updatedAt !== createdAt && (
          <div className="flex items-start gap-3 text-sm border-t pt-3">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-700">Last Updated</div>
              <div className="text-gray-600">{formatDate(updatedAt)}</div>
              {updater && (
                <div className="text-xs text-gray-500 mt-1">
                  by {getUserName(updater)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`space-y-1 text-xs text-gray-500 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="font-medium">Created:</span>
        <span>{formatDate(createdAt)}</span>
        {creator && (
          <span className="text-gray-400">
            by {getUserName(creator)}
          </span>
        )}
      </div>

      {updatedAt !== createdAt && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">Updated:</span>
          <span>{formatDate(updatedAt)}</span>
          {updater && (
            <span className="text-gray-400">
              by {getUserName(updater)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline audit badge for table cells
 */
export function AuditBadge({ updatedAt, className = '' }: { updatedAt: string | Date; className?: string }) {
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy');
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <Clock className="w-3 h-3" />
      {formatDate(updatedAt)}
    </span>
  );
}
