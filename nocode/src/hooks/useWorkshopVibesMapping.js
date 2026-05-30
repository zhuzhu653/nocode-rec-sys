import { useQuery, useMutation } from "@tanstack/react-query";

// 获取氛围映射
export const useVibesMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopVibesMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { vibeId: 1, vibeName: "安静" },
        { vibeId: 2, vibeName: "创意" },
        { vibeId: 3, vibeName: "放松" },
      ];
    },
  });
};

// 添加氛围映射
export const useAddVibeMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, vibeId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加氛围 ${vibeId}`);
      return { success: true };
    },
  });
};

// 移除氛围映射
export const useRemoveVibeMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, vibeId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除氛围 ${vibeId}`);
      return { success: true };
    },
  });
};
