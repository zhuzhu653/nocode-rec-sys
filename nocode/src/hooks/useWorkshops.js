import { useQuery } from "@tanstack/react-query";
import { getWorkshops, searchWorkshops, getWorkshopCategories, getWorkshopById } from "@/integrations/supabase/client";

// 获取所有工作坊
const useWorkshops = (filters = {}, sortBy = "popularity") => {
  return useQuery({
    queryKey: ["workshops", filters, sortBy],
    queryFn: async () => {
      try {
        return await getWorkshops(filters, sortBy);
      } catch (error) {
        console.error("获取工作坊数据失败:", error);
        throw error;
      }
    },
  });
};

// 搜索工作坊
const useSearchWorkshops = (query) => {
  return useQuery({
    queryKey: ["searchWorkshops", query],
    queryFn: async () => {
      try {
        if (!query) return [];
        return await searchWorkshops(query);
      } catch (error) {
        console.error("搜索工作坊失败:", error);
        throw error;
      }
    },
    enabled: !!query, // 只有有搜索词时才执行
  });
};

// 获取工作坊详情
const useWorkshopDetail = (id) => {
  return useQuery({
    queryKey: ["workshopDetail", id],
    queryFn: async () => {
      try {
        if (!id) throw new Error("工作坊ID不能为空");
        return await getWorkshopById(id);
      } catch (error) {
        console.error("获取工作坊详情失败:", error);
        throw error;
      }
    },
    enabled: !!id, // 只有有ID时才执行
  });
};

// 获取工作坊分类
const useWorkshopCategories = () => {
  return useQuery({
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
};

export {
  useWorkshops,
  useSearchWorkshops,
  useWorkshopDetail,
  useWorkshopCategories
};
