'use client';

import { CommentItem } from './comment-item';
import { CandidateComment } from '@/lib/types/recruitment';
import { MessageSquare } from 'lucide-react';

interface CommentThreadProps {
  comments: CandidateComment[];
  candidateId: number;
  orgSlug: string;
  onCommentUpdated: () => void;
}

export function CommentThread({
  comments,
  candidateId,
  orgSlug,
  onCommentUpdated,
}: CommentThreadProps) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium mb-1">No comments yet</p>
        <p className="text-sm text-gray-500">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id}>
          {/* Top-level Comment */}
          <CommentItem
            comment={comment}
            candidateId={candidateId}
            orgSlug={orgSlug}
            onUpdated={onCommentUpdated}
          />

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-3 mt-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  candidateId={candidateId}
                  orgSlug={orgSlug}
                  isReply
                  onUpdated={onCommentUpdated}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
