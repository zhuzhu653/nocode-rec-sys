import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationAsRead } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, UserPlus, X, RefreshCw } from 'lucide-react';

const NotificationDropdown = ({ onClose, notifications = [], isLoading }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(['unreadNotificationCount']);
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification) => {
    // 标记为已读
    await markAsReadMutation.mutateAsync(notification.id);

    // 跳转到对应帖子
    if (notification.post_id) {
      navigate(`/community?post=${notification.post_id}`);
    }

    onClose();
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '刚刚';
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries(['notifications']);
    queryClient.invalidateQueries(['unreadNotificationCount']);
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#e8e3db] z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-[#e8e3db]">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[#333]">通知</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1 rounded-full hover:bg-[#e8e3db] transition-colors"
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[#e8e3db] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-2">
        {isLoading ? (
          // 加载状态
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-[#e8e3db]"></div>
              <div className="flex-1">
                <div className="h-3 bg-[#e8e3db] rounded mb-2 w-3/4"></div>
                <div className="h-2 bg-[#e8e3db] rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          // 空状态
          <div className="text-center py-8 text-[#999]">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          // 通知列表
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 p-3 hover:bg-[#f9f7f3] cursor-pointer transition-colors ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex-shrink-0">
                <img
                  src={notification.actor?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32"}
                  alt={notification.actor?.display_name || '用户'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm text-[#333] line-clamp-2">
                    {notification.message}
                  </p>
                  {getNotificationIcon(notification.type)}
                </div>
                <p className="text-xs text-[#999]">
                  {formatNotificationTime(notification.created_at)}
                </p>
                {notification.comment?.content && (
                  <p className="text-xs text-[#666] mt-1 bg-[#f9f7f3] p-2 rounded line-clamp-2">
                    {notification.comment.content}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
