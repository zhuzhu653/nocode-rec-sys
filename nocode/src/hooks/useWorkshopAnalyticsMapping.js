import { useQuery, useMutation } from "@tanstack/react-query";

// 获取分析映射
export const useAnalyticsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopAnalyticsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { analyticsId: 1, date: "2023-12-15", views: 120, clicks: 45, bookmarks: 12, shares: 8, favorites: 15 },
        { analyticsId: 2, date: "2023-12-16", views: 98, clicks: 38, bookmarks: 10, shares: 6, favorites: 12 },
      ];
    },
  });
};

// 添加分析映射
export const useAddAnalyticsMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, analyticsId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加分析数据 ${analyticsId}`);
      return { success: true };
    },
  });
};

// 移除分析映射
export const useRemoveAnalyticsMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, analyticsId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除分析数据 ${analyticsId}`);
      return { success: true };
    },
  });
};
