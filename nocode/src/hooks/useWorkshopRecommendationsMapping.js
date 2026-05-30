import { useQuery, useMutation } from "@tanstack/react-query";

// 获取推荐映射
export const useRecommendationsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopRecommendationsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { recommendationId: 1, title: "水彩画入门课程" },
        { recommendationId: 2, title: "木工制作体验" },
      ];
    },
  });
};

// 添加推荐映射
export const useAddRecommendationMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, recommendationId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加推荐 ${recommendationId}`);
      return { success: true };
    },
  });
};

// 移除推荐映射
export const useRemoveRecommendationMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, recommendationId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除推荐 ${recommendationId}`);
      return { success: true };
    },
  });
};
