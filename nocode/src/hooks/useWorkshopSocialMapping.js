import { useQuery, useMutation } from "@tanstack/react-query";

// 获取社交媒体映射
export const useSocialMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopSocialMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { socialId: 1, socialName: "微信公众号" },
        { socialId: 2, socialName: "微博" },
      ];
    },
  });
};

// 添加社交媒体映射
export const useAddSocialMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, socialId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加社交媒体 ${socialId}`);
      return { success: true };
    },
  });
};

// 移除社交媒体映射
export const useRemoveSocialMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, socialId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除社交媒体 ${socialId}`);
      return { success: true };
    },
  });
};
