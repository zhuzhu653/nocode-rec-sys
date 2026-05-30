import { supabase } from '@/integrations/supabase/client';

export const setupNotificationRealtime = (userId, callback) => {
  console.log('设置通知实时监听...');

  const subscription = supabase
    .channel(`user-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 新通知:', payload);
        callback(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('📝 通知更新:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('通知订阅状态:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ 通知实时监听已建立');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ 通知实时监听失败，请检查发布配置');
      }
    });

  return subscription;
};

// 显示桌面通知
const showDesktopNotification = (notification) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('新通知', {
      body: notification.message,
      icon: '/icon-192.png'
    });
  }
};

// 请求通知权限
export const requestNotificationPermission = async () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('通知权限:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  }
  return false;
};

// 测试实时功能
export const testNotificationRealtime = async (userId) => {
  return new Promise((resolve) => {
    console.log('🧪 测试通知实时功能...');

    let testPassed = false;
    const testTimeout = 30000; // 30秒超时

    const subscription = supabase
      .channel(`test-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('✅ 测试通过：收到实时通知', payload);
          testPassed = true;
          subscription.unsubscribe();
          resolve(true);
        }
      )
      .subscribe((status) => {
        console.log('测试订阅状态:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ 订阅成功，等待测试数据...');
          // 自动创建一条测试通知
          createTestNotification(userId);
        }
      });

    // 超时处理
    setTimeout(() => {
      if (!testPassed) {
        console.log('❌ 测试超时：未收到实时通知');
        subscription.unsubscribe();
        resolve(false);
      }
    }, testTimeout);
  });
};

// 创建测试通知
const createTestNotification = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'test',
        message: '测试实时功能',
        actor_id: userId
      });

    if (error) {
      console.error('创建测试通知失败:', error);
    } else {
      console.log('测试通知已创建');
    }
  } catch (error) {
    console.error('创建测试通知异常:', error);
  }
};
