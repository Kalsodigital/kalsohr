'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentThread } from './comment-thread';
import { CommentForm } from './comment-form';
import { getCandidateComments, markCommentsAsViewed } from '@/lib/api/org/recruitment';
import { CandidateComment, SectionKey } from '@/lib/types/recruitment';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface SectionCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: number;
  sectionKey: SectionKey;
  sectionLabel: string;
  orgSlug: string;
  onSuccess?: () => void;
}

export function SectionCommentsDialog({
  open,
  onOpenChange,
  candidateId,
  sectionKey,
  sectionLabel,
  orgSlug,
  onSuccess,
}: SectionCommentsDialogProps) {
  const [comments, setComments] = useState<CandidateComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await getCandidateComments(orgSlug, candidateId, sectionKey);
      if (data?.comments) {
        setComments(data.comments);
      }
    } catch (error: any) {
      console.error('Error loading comments:', error);
      // Don't show error toast since backend is not implemented yet
      setComments([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const markAsViewed = async () => {
    try {
      await markCommentsAsViewed(orgSlug, candidateId, sectionKey);
      // Notify parent to refresh unread counts
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error marking comments as viewed:', error);
      // Silently fail - not critical for UX
    }
  };

  useEffect(() => {
    if (open) {
      loadComments();
      // Mark comments as viewed when dialog opens
      markAsViewed();
    }
  }, [open, candidateId, sectionKey]);

  const handleCommentSuccess = () => {
    loadComments();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-blue-100 p-2 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-bold">{sectionLabel}</div>
              <div className="text-sm text-gray-500 font-normal mt-0.5">
                Discussion & Feedback
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Separator />

        {/* Content Area - Scrollable Comments */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <CommentThread
                comments={comments}
                candidateId={candidateId}
                orgSlug={orgSlug}
                onCommentUpdated={handleCommentSuccess}
              />
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer - Fixed Comment Form */}
        <div className="px-6 py-4 bg-gray-50">
          <CommentForm
            candidateId={candidateId}
            sectionKey={sectionKey}
            orgSlug={orgSlug}
            onSuccess={handleCommentSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
