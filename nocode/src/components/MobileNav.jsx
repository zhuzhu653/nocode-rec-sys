import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Map, Calendar, Users, Star, User, Settings, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <Home className="h-5 w-5" />, label: '首页' },
    { to: '/discover', icon: <Map className="h-5 w-5" />, label: '发现' },
    { to: '/experience', icon: <Calendar className="h-5 w-5" />, label: '体验' },
    { to: '/community', icon: <Users className="h-5 w-5" />, label: '社区' },
    { to: '/instructors', icon: <Star className="h-5 w-5" />, label: '达人' },
    { to: '/marketplace', icon: <ShoppingBag className="h-5 w-5" />, label: '集市' },
    { to: '/user-center', icon: <User className="h-5 w-5" />, label: '我的' },
    { to: '/settings', icon: <Settings className="h-5 w-5" />, label: '设置' },
  ];

  return (
    <div className="md:hidden">
      {/* 汉堡菜单按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-[#f9f7f3] border border-[#e8e3db] text-[#333]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* 导航菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 right-0 w-64 h-[calc(100vh-4rem)] bg-white border-l border-[#e8e3db] shadow-lg z-50 overflow-y-auto"
          >
            <div className="p-4">
              <h3 className="text-lg font-light text-[#333] mb-4">导航菜单</h3>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      location.pathname === item.to
                        ? 'bg-[#d4a373]/10 text-[#d4a373]'
                        : 'text-[#666] hover:bg-[#f9f7f3]'
                    }`}
                  >
                    {item.icon}
                    <span className="font-light">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 背景遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNav;
