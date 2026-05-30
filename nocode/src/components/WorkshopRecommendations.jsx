import { motion } from "framer-motion";

const WorkshopRecommendations = ({ workshops }) => {
  // 添加空值检查，防止workshops为undefined或null时调用map方法
  if (!workshops || !Array.isArray(workshops) || workshops.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-medium mb-4">相关推荐</h2>
        <p className="text-gray-500">暂无相关推荐</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-medium mb-4">相关推荐</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workshops.map((item, index) => (
          <motion.div 
            key={item.id} 
            className="flex items-center space-x-4 p-4 rounded-xl border border-[#e8e3db] hover:border-[#d4a373]/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <img 
              src={item.image} 
              alt={item.title}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-medium text-[#333]">{item.title}</h3>
              <p className="text-[#d4a373] font-medium">¥{item.price}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WorkshopRecommendations;
