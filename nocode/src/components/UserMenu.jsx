import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, UserCircle } from "lucide-react";

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 检查用户登录状态
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    checkUser();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsOpen(false);
    navigate("/");
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#d4a373] text-white hover:bg-[#c99a67] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4a373] focus:ring-offset-2"
        aria-label="用户菜单"
      >
        {user ? (
          <img
            src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
            alt="用户头像"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-[#e8e3db] z-50 overflow-hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {user ? (
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <img
                      src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                      alt="用户头像"
                      className="h-10 w-10 rounded-full object-cover mr-3"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#333]">
                        {user.user_metadata?.display_name || user.email}
                      </p>
                      <p className="text-xs text-[#999]">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => handleNavigate("/user-center-true")}
                      className="flex items-center w-full px-3 py-2 text-sm text-[#333] hover:bg-[#f9f7f3] rounded-lg transition-colors"
                    >
                      <UserCircle className="h-4 w-4 mr-3" />
                      个人中心
                    </button>
                    <button
                      onClick={() => handleNavigate("/settings")}
                      className="flex items-center w-full px-3 py-2 text-sm text-[#333] hover:bg-[#f9f7f3] rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      个人设置
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm text-[#333] hover:bg-[#f9f7f3] rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      退出登录
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-[#666] mb-3">您尚未登录</p>
                  <button
                    onClick={() => {
                      navigate("/auth");
                      setIsOpen(false);
                    }}
                    className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white py-2 px-4 rounded-full text-sm transition-colors"
                  >
                    登录 / 注册
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
