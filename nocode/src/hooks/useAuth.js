import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * 用户认证钩子，用于管理用户登录状态
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('获取用户信息失败:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut
  };
};
