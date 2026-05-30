import { MapPin, Calendar, Users, Tag } from "lucide-react";
import { motion } from "framer-motion";

const QuickAccess = () => {
  const items = [
    { icon: <MapPin className="h-5 w-5" />, label: "推荐路线" },
    { icon: <Calendar className="h-5 w-5" />, label: "最新活动" },
    { icon: <Users className="h-5 w-5" />, label: "热门达人" },
    { icon: <Tag className="h-5 w-5" />, label: "限时优惠" },
  ];

  return (
    <div className="container py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.button
            key={index}
            className="flex flex-col items-center justify-center rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] p-6 text-[#333] shadow-sm transition-all hover:bg-[#e8e3db] hover:text-[#d4a373] hover:shadow-md md:p-4 sm:p-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="mb-3 rounded-full bg-[#d4a373]/10 p-3 text-[#d4a373] md:p-2 sm:p-1.5">
              {item.icon}
            </div>
            <span className="text-sm font-light md:text-xs sm:text-xs">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccess;
