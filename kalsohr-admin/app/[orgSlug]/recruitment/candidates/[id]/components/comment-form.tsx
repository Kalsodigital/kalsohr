'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './star-rating';
import { createCandidateComment } from '@/lib/api/org/recruitment';
import { SectionKey } from '@/lib/types/recruitment';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CommentFormProps {
  candidateId: number;
  sectionKey?: SectionKey;
  orgSlug: string;
  parentCommentId?: number | null;
  isReply?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CommentForm({
  candidateId,
  sectionKey,
  orgSlug,
  parentCommentId = null,
  isReply = false,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxLength = 5000;
  const remainingChars = maxLength - comment.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (comment.length > maxLength) {
      toast.error(`Comment must be less than ${maxLength} characters`);
      return;
    }

    try {
      setIsSubmitting(true);

      await createCandidateComment(orgSlug, candidateId, {
        sectionKey: parentCommentId ? undefined : sectionKey,
        comment: comment.trim(),
        rating: !isReply && rating ? rating : undefined,
        parentCommentId: parentCommentId || undefined,
      });

      toast.success(isReply ? 'Reply added successfully' : 'Comment added successfully');
      setComment('');
      setRating(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating comment:', error);
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Star Rating - Only show for top-level comments */}
      {!isReply && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Rating (optional)
          </label>
          <StarRating value={rating} onChange={setRating} size="md" showLabel />
        </div>
      )}

      {/* Comment Text Area */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          {isReply ? 'Reply' : 'Comment'}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isReply
              ? 'Write your reply...'
              : 'Share your thoughts, feedback, or evaluation...'
          }
          rows={isReply ? 3 : 4}
          maxLength={maxLength}
          className="resize-none focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center mt-1.5">
          <span
            className={`text-xs ${
              remainingChars < 100 ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-w-[80px]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!comment.trim() || isSubmitting}
          className="min-w-[100px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : isReply ? (
            'Post Reply'
          ) : (
            'Post Comment'
          )}
        </Button>
      </div>
    </form>
  );
}
