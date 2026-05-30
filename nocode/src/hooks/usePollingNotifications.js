import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getUnreadNotificationCount, getUserNotifications } from '@/integrations/supabase/client';

export const usePollingNotifications = (userId, options = {}) => {
  const {
    enabled = true,
    pollingInterval = 10000, // 10秒
    onNewNotification
  } = options;

  const queryClient = useQueryClient();

  // 未读数量轮询
  const { data: unreadCount, error: countError } = useQuery({
    queryKey: ['unreadNotificationCount', userId],
    queryFn: () => getUnreadNotificationCount(userId),
    enabled: enabled && !!userId,
    refetchInterval: pollingInterval,
  });

  // 通知列表轮询
  const { data: notifications, error: listError } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getUserNotifications(userId),
    enabled: enabled && !!userId,
    refetchInterval: pollingInterval * 2, // 20秒
  });

  // 检测新通知
  useEffect(() => {
    if (notifications && onNewNotification) {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      if (unreadNotifications.length > 0) {
        onNewNotification(unreadNotifications[0]);
      }
    }
  }, [notifications, onNewNotification]);

  return {
    unreadCount: unreadCount || 0,
    notifications: notifications || [],
    isLoading: !notifications && !countError && !listError,
    error: countError || listError
  };
};
