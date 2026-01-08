'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SectionCommentsDialog } from './section-comments-dialog';
import { SectionKey } from '@/lib/types/recruitment';

interface SectionCommentsIconProps {
  candidateId: number;
  sectionKey: SectionKey;
  sectionLabel: string;
  commentCount: number;
  unreadCount: number;
  orgSlug: string;
  onCommentAdded: () => void;
}

export function SectionCommentsIcon({
  candidateId,
  sectionKey,
  sectionLabel,
  commentCount,
  unreadCount,
  orgSlug,
  onCommentAdded,
}: SectionCommentsIconProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasUnread = unreadCount > 0;

  const handleSuccess = () => {
    onCommentAdded();
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse-red {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .pulse-animation {
          animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="relative h-8 w-8 p-0 hover:bg-blue-50"
            >
              <MessageSquare className="w-4 h-4 text-gray-600 hover:text-blue-600" />
              {commentCount > 0 && (
                <Badge
                  variant="default"
                  className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] ${
                    hasUnread
                      ? 'bg-red-600 hover:bg-red-600 pulse-animation'
                      : 'bg-blue-600 hover:bg-blue-600'
                  }`}
                >
                  {commentCount > 99 ? '99+' : commentCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {commentCount === 0
                ? 'No comments'
                : hasUnread
                ? `${unreadCount} unread of ${commentCount} total`
                : `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'} (all read)`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SectionCommentsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        candidateId={candidateId}
        sectionKey={sectionKey}
        sectionLabel={sectionLabel}
        orgSlug={orgSlug}
        onSuccess={handleSuccess}
      />
    </>
  );
}
