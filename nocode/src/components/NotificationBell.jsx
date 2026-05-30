import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnreadNotificationCount, markAllNotificationsAsRead } from '@/integrations/supabase/client';
import { usePollingNotifications } from '@/hooks/usePollingNotifications';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    unreadCount,
    notifications,
    isLoading
  } = usePollingNotifications(user?.id, {
    pollingInterval: 15000, // 15秒
    onNewNotification: (newNotification) => {
      // 显示桌面通知
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('新通知', {
          body: newNotification.message,
          icon: newNotification.actor?.avatar_url
        });
      }
    }
  });

  // 标记所有为已读的mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['unreadNotificationCount']);
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // 请求通知权限
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleBellClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (unreadCount > 0 && !isDropdownOpen) {
      markAllAsReadMutation.mutate();
    }
  };

  return (
    <div className="relative">
      <button
        className="relative inline-flex items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-[#e8e3db] hover:text-[#333] h-9 w-9"
        onClick={handleBellClick}
        disabled={isLoading}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <span className="sr-only">通知</span>
      </button>

      {isDropdownOpen && (
        <NotificationDropdown
          onClose={() => setIsDropdownOpen(false)}
          notifications={notifications}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default NotificationBell;
