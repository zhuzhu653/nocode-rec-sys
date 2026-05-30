import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import WorkshopCardWithBooking from "../components/WorkshopCardWithBooking";
import { getWorkshops, searchWorkshops, getWorkshopCategories } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const ExperienceWithBooking = () => {
  const [sortBy, setSortBy] = useState("popularity");
  const [filters, setFilters] = useState({ category: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // 从URL参数中获取城市筛选
  useEffect(() => {
    const city = searchParams.get("city");
    if (city) {
      setFilters(prev => ({ ...prev, city }));
    } else {
      // 移除城市筛选
      setFilters(prev => {
        const { city, ...rest } = prev;
        return rest;
      });
    }
  }, [searchParams]);

  // 获取工作坊数据
  const { data: workshops, isLoading, error } = useQuery({
    queryKey: ["workshops", sortBy, filters, searchQuery],
    queryFn: async () => {
      try {
        if (searchQuery) {
          return await searchWorkshops(searchQuery);
        } else {
          return await getWorkshops(filters, sortBy);
        }
      } catch (error) {
        console.error("获取工作坊数据失败:", error);
        throw error;
      }
    },
  });

  // 获取分类数据
  const { data: categories } = useQuery({
    queryKey: ["workshopCategories"],
    queryFn: async () => {
      try {
        return await getWorkshopCategories();
      } catch (error) {
        console.error("获取分类数据失败:", error);
        throw error;
      }
    },
  });

  // 城市名称映射
  const cityNames = {
    1: "北京",
    2: "上海",
    3: "南京",
    4: "杭州",
    5: "西安",
    6: "重庆"
  };

  // 清除城市筛选
  const clearCityFilter = () => {
    setSearchParams({});
  };

  // 处理搜索
  const handleSearch = (e) => {
    e.preventDefault();
    // 搜索逻辑已经在 useQuery 中处理
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light">创益工作坊 - 体验</h1>
        
          {/* 显示当前城市筛选 */}
          {filters.city && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-[#666]">
                当前城市: {cityNames[filters.city] || filters.city}
              </span>
              <button
                onClick={clearCityFilter}
                className="text-sm text-[#d4a373] hover:text-[#b3824f] transition-colors"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        {/* 合并的搜索筛选栏 */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* 搜索框 */}
          <div className="flex-1">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#999]" />
                <Input
                  type="text"
                  placeholder="搜索工作坊..."
                  className="pl-10 pr-20 rounded-full border-[#e8e3db] bg-[#f9f7f3]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                  type="submit"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
                >
                  搜索
                </Button>
              </div>
            </form>
          </div>

          {/* 筛选和排序 */}
          <div className="flex gap-3">
            {/* 分类筛选 */}
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a373]"
            >
              <option value="all">全部分类</option>
              {categories?.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
        
            {/* 排序 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a373]"
            >
              <option value="popularity">热门优先</option>
              <option value="newest">最新发布</option>
              <option value="price">价格排序</option>
            </select>
          </div>
        </div>
        
        {/* 工作坊网格 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p className="font-bold">数据加载失败</p>
            <p>无法连接到数据库，请检查网络连接或联系管理员。</p>
          </div>
        ) : workshops?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">暂无工作坊数据</p>
            <p className="text-sm">请尝试调整搜索或筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops?.map((workshop, index) => (
              <WorkshopCardWithBooking 
                key={workshop.id} 
                workshop={workshop} 
                index={index} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperienceWithBooking;
