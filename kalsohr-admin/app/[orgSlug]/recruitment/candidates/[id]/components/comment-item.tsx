'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Reply, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StarRating } from './star-rating';
import { CommentForm } from './comment-form';
import { CandidateComment } from '@/lib/types/recruitment';
import { deleteCandidateComment } from '@/lib/api/org/recruitment';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';

interface CommentItemProps {
  comment: CandidateComment;
  candidateId: number;
  orgSlug: string;
  isReply?: boolean;
  onUpdated: () => void;
}

export function CommentItem({
  comment,
  candidateId,
  orgSlug,
  isReply = false,
  onUpdated,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuthStore();

  const isOwnComment = user?.id === comment.userId;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCandidateComment(orgSlug, candidateId, comment.id);
      toast.success('Comment deleted successfully');
      onUpdated();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error.message || 'Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  const getUserName = () => {
    if (!comment.user) return 'Unknown User';
    const { firstName, lastName } = comment.user;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return 'Unknown User';
  };

  const getUserInitials = () => {
    if (!comment.user) return 'U';
    const { firstName, lastName } = comment.user;
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getRelativeTime = () => {
    try {
      const date = new Date(comment.createdAt);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className={`${isReply ? 'ml-10 mt-3' : ''}`}>
      <div className={`flex gap-3 ${isReply ? 'border-l-2 border-gray-200 pl-4' : ''}`}>
        {/* Avatar */}
        <Avatar className="w-8 h-8 mt-0.5">
          <AvatarImage src={comment.user?.avatar || undefined} />
          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">
                  {getUserName()}
                </span>
                <span className="text-xs text-gray-500">
                  {getRelativeTime()}
                </span>
              </div>
              {/* Star Rating - Only for top-level comments */}
              {!isReply && comment.rating && (
                <div className="mt-1">
                  <StarRating value={comment.rating} readonly size="sm" showLabel />
                </div>
              )}
            </div>
          </div>

          {/* Comment Text */}
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2">
            {comment.comment}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Reply Button - Only on top-level comments */}
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="h-7 px-2 text-xs text-gray-600 hover:text-blue-600"
              >
                <Reply className="w-3.5 h-3.5 mr-1" />
                Reply
              </Button>
            )}

            {/* Delete Button - Only for own comments */}
            {isOwnComment && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    className="h-7 px-2 text-xs text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your comment
                      {comment.replies && comment.replies.length > 0 &&
                        ` and ${comment.replies.length} ${
                          comment.replies.length === 1 ? 'reply' : 'replies'
                        }`}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <CommentForm
                candidateId={candidateId}
                orgSlug={orgSlug}
                parentCommentId={comment.id}
                isReply
                onSuccess={() => {
                  setShowReplyForm(false);
                  onUpdated();
                }}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
