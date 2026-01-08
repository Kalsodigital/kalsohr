'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Clock, User, Star, Reply, Send, CornerDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getRecentComments, createCandidateComment, getCandidateComments } from '@/lib/api/org/recruitment';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { SectionKey } from '@/lib/types/recruitment';

interface RecentCommentsWidgetProps {
  orgSlug: string;
  limit?: number;
}

export function RecentCommentsWidget({ orgSlug, limit = 10 }: RecentCommentsWidgetProps) {
  const router = useRouter();
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);
  const [threadData, setThreadData] = useState<any>(null);

  useEffect(() => {
    const loadComments = async () => {
      try {
        setIsLoading(true);
        const data = await getRecentComments(orgSlug, limit);
        setComments(data);
      } catch (error) {
        console.error('Error loading recent comments:', error);
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [orgSlug, limit]);

  const handleCommentClick = async (comment: any) => {
    try {
      // Load full thread for this section
      const data = await getCandidateComments(orgSlug, comment.candidateId, comment.sectionKey);
      setThreadData({
        candidateId: comment.candidateId,
        candidate: comment.candidate,
        sectionKey: comment.sectionKey,
        comments: data.comments || [],
      });
      setThreadDialogOpen(true);
    } catch (error) {
      console.error('Failed to load thread:', error);
      toast.error('Failed to load comment thread');
    }
  };

  const handleReplyClick = (comment: any) => {
    setSelectedComment(comment);
    setReplyText('');
    setReplyDialogOpen(true);
  };

  const handleReplySubmit = async () => {
    if (!selectedComment || !replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setIsSubmitting(true);
      await createCandidateComment(orgSlug, selectedComment.candidateId, {
        sectionKey: selectedComment.sectionKey,
        comment: replyText.trim(),
        parentCommentId: selectedComment.id,
      });

      toast.success('Reply posted successfully!');
      setReplyText('');
      setReplyDialogOpen(false);
      setSelectedComment(null);

      // Refresh comments
      const data = await getRecentComments(orgSlug, limit);
      setComments(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unreadCount = comments.filter((c) => c.isUnread).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-blue-100 p-2 rounded-lg">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <span>Recent Comments</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
        </div>
        <p className="text-sm text-gray-500 mt-1">Latest feedback on candidates</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent comments</p>
            <p className="text-xs text-gray-400 mt-1">Comments will appear here when added</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border transition-all ${
                    comment.isUnread
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Header */}
                  <div
                    className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                    onClick={() => handleCommentClick(comment)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {comment.candidate?.firstName?.[0]}
                        {comment.candidate?.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {comment.candidate?.firstName} {comment.candidate?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {comment.candidate?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {comment.parentCommentId && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          <CornerDownRight className="w-2.5 h-2.5 mr-0.5" />
                          Reply
                        </Badge>
                      )}
                      {comment.isUnread && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Parent Comment Context (if it's a reply) */}
                  {comment.parentComment && (
                    <div className="mb-2 pl-3 border-l-2 border-gray-300 cursor-pointer" onClick={() => handleCommentClick(comment)}>
                      <p className="text-xs text-gray-500 mb-1">
                        Replying to {comment.parentComment.user.firstName}:
                      </p>
                      <p className="text-xs text-gray-600 italic line-clamp-1">
                        "{comment.parentComment.comment}"
                      </p>
                    </div>
                  )}

                  {/* Comment Preview */}
                  <p
                    className="text-sm text-gray-700 line-clamp-2 mb-2 cursor-pointer"
                    onClick={() => handleCommentClick(comment)}
                  >
                    {comment.comment}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>
                          {comment.user?.firstName} {comment.user?.lastName}
                        </span>
                        {comment.user?.role?.name && (
                          <span className="text-gray-400">· {comment.user.role.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                      </div>
                      {comment.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{comment.rating}/5</span>
                        </div>
                      )}
                    </div>
                    {!comment.parentCommentId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyClick(comment);
                        }}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {comments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${orgSlug}/recruitment/candidates`)}
            >
              View All Candidates
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Reply className="w-4 h-4 text-blue-600" />
              </div>
              Reply to Comment
            </DialogTitle>
          </DialogHeader>

          {selectedComment && (
            <div className="space-y-4">
              {/* Original Comment Preview */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-semibold">
                    {selectedComment.candidate?.firstName?.[0]}
                    {selectedComment.candidate?.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedComment.candidate?.firstName} {selectedComment.candidate?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedComment.user?.firstName} {selectedComment.user?.lastName}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{selectedComment.comment}</p>
              </div>

              {/* Reply Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Your Reply</label>
                <Textarea
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  {replyText.length}/5000 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyText('');
                setSelectedComment(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplySubmit}
              disabled={isSubmitting || !replyText.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread Viewing Dialog */}
      <Dialog open={threadDialogOpen} onOpenChange={setThreadDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Comment Thread</p>
                  {threadData && (
                    <p className="text-sm font-normal text-gray-500">
                      {threadData.candidate?.firstName} {threadData.candidate?.lastName}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setThreadDialogOpen(false);
                  router.push(`/${orgSlug}/recruitment/candidates/${threadData?.candidateId}`);
                }}
              >
                View Candidate
              </Button>
            </DialogTitle>
          </DialogHeader>

          {threadData && (
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                {threadData.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg border ${
                      comment.parentCommentId
                        ? 'ml-8 bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {comment.user?.firstName?.[0]}
                        {comment.user?.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-semibold text-sm">
                              {comment.user?.firstName} {comment.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {comment.rating && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                              {comment.rating}/5
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {comment.replies.map((reply: any) => (
                              <div
                                key={reply.id}
                                className="pl-4 border-l-2 border-gray-300"
                              >
                                <div className="flex items-start gap-2 mb-1">
                                  <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                    {reply.user?.firstName?.[0]}
                                    {reply.user?.lastName?.[0]}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      {reply.user?.firstName} {reply.user?.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap ml-10">
                                  {reply.comment}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
