import { useQuery, useMutation } from "@tanstack/react-query";

// 获取关联映射
export const useRelatedMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopRelatedMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { relatedId: 1, title: "陶艺材料店" },
        { relatedId: 2, title: "陶艺工具店" },
      ];
    },
  });
};

// 添加关联映射
export const useAddRelatedMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, relatedId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加关联 ${relatedId}`);
      return { success: true };
    },
  });
};

// 移除关联映射
export const useRemoveRelatedMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, relatedId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除关联 ${relatedId}`);
      return { success: true };
    },
  });
};
