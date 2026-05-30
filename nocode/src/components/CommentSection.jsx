import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getComments,
  createComment,
  deleteComment,
  updatePostCommentsCount,
  ensureUserProfile,
  createCommentNotification,
  createReplyNotification,
  supabase
} from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Trash2, MessageCircle, Reply, X } from 'lucide-react';

const CommentSection = ({ postId, onClose }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // 存储正在回复的评论信息
  const [replyContent, setReplyContent] = useState(''); // 回复内容
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // 验证 postId
  useEffect(() => {
    console.log('CommentSection received postId:', postId);
    if (!postId) {
      console.error('CommentSection: postId is undefined');
    }
  }, [postId]);

  // 获取评论列表 - 添加 postId 验证
  const { data: comments, isLoading, error } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => {
      if (!postId) {
        console.error('获取评论失败: postId 未定义');
        throw new Error('postId 未定义');
      }
      console.log('正在获取评论，postId:', postId);
      return getComments(postId);
    },
    enabled: !!postId, // 只有 postId 存在时才执行查询
  });

  // 发布评论 mutation - 添加通知功能
  const publishCommentMutation = useMutation({
    mutationFn: async (content) => {
      if (!postId) {
        throw new Error('帖子ID无效');
      }
      if (!user?.id) {
        throw new Error('用户未登录');
      }

      // 先检查用户profile是否存在，如果不存在则创建
      await ensureUserProfile(user);

      const commentData = {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
      };
      
      console.log('评论数据:', commentData);
      
      const comment = await createComment(commentData);
      await updatePostCommentsCount(postId, 1);

      // 创建通知
      await createCommentNotification(comment, postId, user.id);

      return comment;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries(['comments', postId]);
      queryClient.invalidateQueries(['communityStories']);
      console.log('评论发布成功');
    },
    onError: (error) => {
      console.error('发布评论失败:', error);
      alert(`发布评论失败: ${error.message}`);
    }
  });

  // 发布回复 mutation
  const publishReplyMutation = useMutation({
    mutationFn: async ({ content, parentComment }) => {
      if (!postId) {
        throw new Error('帖子ID无效');
      }
      if (!user?.id) {
        throw new Error('用户未登录');
      }

      // 先检查用户profile是否存在，如果不存在则创建
      await ensureUserProfile(user);

      const replyData = {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentComment.id,
        mentioned_user_id: parentComment.user_id,
        is_reply: true,
        reply_depth: (parentComment.reply_depth || 0) + 1,
        created_at: new Date().toISOString()
      };

      console.log('回复数据:', replyData);

      const reply = await createComment(replyData);
      await updatePostCommentsCount(postId, 1);

      // 创建回复通知
      await createReplyNotification(reply, postId, user.id);

      return reply;
    },
    onSuccess: () => {
      setReplyContent('');
      setReplyingTo(null);
      queryClient.invalidateQueries(['comments', postId]);
      queryClient.invalidateQueries(['communityStories']);
      console.log('回复发布成功');
    },
    onError: (error) => {
      console.error('发布回复失败:', error);
      alert(`发布回复失败: ${error.message}`);
    }
  });

  // 删除评论 mutation - 添加参数验证
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      if (!postId) {
        throw new Error('帖子ID未定义');
      }
      await deleteComment(commentId);
      // 更新帖子评论计数
      await updatePostCommentsCount(postId, -1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', postId]);
      queryClient.invalidateQueries(['communityStories']);
    },
    onError: (error) => {
      console.error('删除评论失败:', error);
      alert('删除评论失败，请重试');
    }
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    
    if (!postId) {
      alert('帖子信息错误，无法评论');
      return;
    }
    
    if (!newComment.trim()) {
      alert('请输入评论内容');
      return;
    }
    
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }
    
    publishCommentMutation.mutate(newComment);
  };

  const handleSubmitReply = (e) => {
    e.preventDefault();

    if (!postId) {
      alert('帖子信息错误，无法回复');
      return;
    }

    if (!replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }

    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    if (!replyingTo) {
      alert('回复信息错误');
      return;
    }

    publishReplyMutation.mutate({
      content: replyContent,
      parentComment: replyingTo
    });
  };

  const handleStartReply = (comment) => {
    if (!isAuthenticated) {
      alert('请先登录后回复');
      return;
    }
    setReplyingTo(comment);
    setReplyContent(`回复@${comment.profiles?.display_name || '用户'}： `);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const handleDeleteComment = (commentId, commentUserId) => {
    if (commentUserId !== user?.id) {
      alert('只能删除自己的评论');
      return;
    }
    if (confirm('确定要删除这条评论吗？')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatCommentTime = (timestamp) => {
    if (!timestamp) return '刚刚';
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - commentTime) / 1000);
    
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  // 如果 postId 无效，显示错误信息
  if (!postId) {
    return (
      <div className="mt-6">
        <div className="text-center py-8 text-red-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>无法加载评论，帖子信息错误</p>
          <p className="text-sm mt-2">postId: {postId}</p>
          <Button 
            onClick={onClose}
            className="mt-4 bg-[#d4a373] hover:bg-[#c99a67] text-white"
          >
            关闭
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">
        评论 ({comments?.length || 0})
      </h3>

      {/* 显示错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          加载评论失败: {error.message}
        </div>
      )}

      {/* 评论输入框 */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <img
              src={user?.user_metadata?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32"}
              alt="用户头像"
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
          <div className="flex-1">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "写下你的评论..." : "请先登录后评论"}
              className="rounded-lg border-[#e8e3db] bg-[#f9f7f3]"
              disabled={!isAuthenticated || publishCommentMutation.isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!newComment.trim() || !isAuthenticated || publishCommentMutation.isLoading}
            className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg"
          >
            {publishCommentMutation.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* 回复输入框 */}
      {replyingTo && (
        <form onSubmit={handleSubmitReply} className="mb-4 p-4 bg-[#f9f7f3] rounded-lg border border-[#e8e3db]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#666]">
              回复 @{replyingTo.profiles?.display_name || '用户'}
            </span>
            <button
              type="button"
              onClick={handleCancelReply}
              className="text-[#999] hover:text-[#666]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                className="rounded-lg border-[#e8e3db] bg-white"
                disabled={publishReplyMutation.isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!replyContent.trim() || publishReplyMutation.isLoading}
              className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg"
            >
              {publishReplyMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {isLoading ? (
          // 加载状态
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-[#e8e3db]"></div>
              <div className="flex-1">
                <div className="h-4 bg-[#e8e3db] rounded mb-2 w-1/4"></div>
                <div className="h-3 bg-[#e8e3db] rounded w-3/4"></div>
              </div>
            </div>
          ))
        ) : comments?.length === 0 ? (
          // 空状态
          <div className="text-center py-8 text-[#999]">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>还没有评论，快来抢沙发吧~</p>
          </div>
        ) : (
          // 评论列表
          comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <img
                src={comment.profiles?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32"}
                alt={comment.profiles?.display_name || '用户'}
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#333]">
                      {comment.profiles?.display_name || '匿名用户'}
                    </span>
                    <span className="text-xs text-[#999]">
                      {formatCommentTime(comment.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 回复按钮 */}
                    <button
                      onClick={() => handleStartReply(comment)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-[#999] hover:text-[#d4a373] hover:bg-[#f9f7f3] transition-all rounded-full"
                      title="回复"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                    {/* 删除按钮 */}
                    {comment.user_id === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                        disabled={deleteCommentMutation.isLoading}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#999] hover:text-red-500 hover:bg-red-50 transition-all rounded-full"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#666] whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* 显示回复信息 */}
                {comment.parent_comment && (
                  <div className="mt-2 text-xs text-[#999] bg-[#f9f7f3] p-2 rounded">
                    回复 @{comment.parent_comment.profiles?.display_name || '用户'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;