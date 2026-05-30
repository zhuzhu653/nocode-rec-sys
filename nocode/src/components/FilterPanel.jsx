import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Filter, MapPin, Tag, X } from "lucide-react";

const FilterPanel = ({ isOpen, onToggle, onFilterChange, filters }) => {
  const [activeFilters, setActiveFilters] = useState(filters || {
    category: [],
    area: [],
    vibe: [],
  });

  // 当父组件的筛选状态变化时，更新本地状态
  useEffect(() => {
    setActiveFilters(filters || {
      category: [],
      area: [],
      vibe: [],
    });
  }, [filters]);

  const categories = [
    { id: "bookstore", name: "书店", icon: "📚" },
    { id: "gallery", name: "画廊", icon: "🖼️" },
    { id: "cafe", name: "咖啡馆", icon: "☕" },
    { id: "workshop", name: "工坊", icon: "🔨" },
    { id: "museum", name: "博物馆", icon: "🏛️" },
    { id: "park", name: "公园", icon: "🌳" },
  ];

  const areas = [
    { id: "downtown", name: "市中心" },
    { id: "hutong", name: "胡同区" },
    { id: "suburb", name: "郊区" },
    { id: "waterfront", name: "滨水区" },
  ];

  const vibes = [
    { id: "quiet", name: "安静" },
    { id: "creative", name: "创意" },
    { id: "cozy", name: "舒适" },
    { id: "inspiring", name: "启发" },
    { id: "social", name: "社交" },
  ];

  const handleFilterToggle = (type, id) => {
    const newFilters = { ...activeFilters };
    
    if (newFilters[type].includes(id)) {
      newFilters[type] = newFilters[type].filter(item => item !== id);
    } else {
      newFilters[type] = [...newFilters[type], id];
    }
    
    setActiveFilters(newFilters);
    onFilterChange && onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      category: [],
      area: [],
      vibe: [],
    };
    setActiveFilters(emptyFilters);
    onFilterChange && onFilterChange(emptyFilters);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`fixed top-0 left-0 h-full z-50 bg-[#f9f7f3] border-r border-[#e8e3db] shadow-lg flex flex-col ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden`}
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="p-6 border-b border-[#e8e3db] flex items-center justify-between">
          <h2 className="text-xl font-light text-[#333]">筛选</h2>
          <button
            onClick={onToggle}
            className="p-2 rounded-full hover:bg-[#e8e3db] transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-[#666]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#333] flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-[#d4a373]" />
                分类
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleFilterToggle("category", category.id)}
                  className={`flex items-center p-3 rounded-lg border transition-all ${
                    activeFilters.category.includes(category.id)
                      ? "border-[#d4a373] bg-[#d4a373]/10 text-[#d4a373]"
                      : "border-[#e8e3db] hover:border-[#d4a373]/50"
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  <span className="text-sm">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-[#d4a373]" />
              区域
            </h3>
            <div className="space-y-2">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => handleFilterToggle("area", area.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    activeFilters.area.includes(area.id)
                      ? "border-[#d4a373] bg-[#d4a373]/10 text-[#d4a373]"
                      : "border-[#e8e3db] hover:border-[#d4a373]/50"
                  }`}
                >
                  <span className="text-sm">{area.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-[#d4a373]" />
              氛围标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {vibes.map((vibe) => (
                <button
                  key={vibe.id}
                  onClick={() => handleFilterToggle("vibe", vibe.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-all ${
                    activeFilters.vibe.includes(vibe.id)
                      ? "border-[#d4a373] bg-[#d4a373] text-white"
                      : "border-[#e8e3db] hover:border-[#d4a373]/50"
                  }`}
                >
                  {vibe.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="w-full py-2 border border-[#e8e3db] rounded-lg text-sm text-[#666] hover:bg-[#e8e3db] transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4 mr-2" />
            清除筛选
          </button>
        </div>
      </motion.div>

      <button
        onClick={onToggle}
        className={`fixed top-1/2 left-0 z-50 bg-[#d4a373] text-white p-3 rounded-r-lg shadow-lg transition-all ${
          isOpen ? "left-80" : "left-0"
        }`}
      >
        {isOpen ? <ChevronLeft className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
      </button>
    </>
  );
};

export default FilterPanel;
