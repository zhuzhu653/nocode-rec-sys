import { Home, Map, Calendar, Users, Star, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MobileBottomNav = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: '首页' },
    { to: '/discover', icon: Map, label: '发现' },
    { to: '/experience', icon: Calendar, label: '体验' },
    { to: '/community', icon: Users, label: '社区' },
    { to: '/instructors', icon: Star, label: '达人' },
    { to: '/user-center', icon: User, label: '我的' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8e3db] z-40 shadow-lg">
      <div className="flex justify-around p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to ||
                         (item.to === '/discover' && location.pathname.startsWith('/discover')) ||
                         (item.to === '/experience' && location.pathname.startsWith('/experience')) ||
                         (item.to === '/instructors' && location.pathname.startsWith('/instructor'));

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-[#d4a373]'
                  : 'text-[#666] hover:text-[#d4a373]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-light">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
