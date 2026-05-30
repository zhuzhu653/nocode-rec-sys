import { useQuery, useMutation } from "@tanstack/react-query";

// 获取无障碍设施映射
export const useAccessibilityMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopAccessibilityMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { accessibilityId: 1, accessibilityName: "轮椅通道" },
        { accessibilityId: 2, accessibilityName: "无障碍卫生间" },
      ];
    },
  });
};

// 添加无障碍设施映射
export const useAddAccessibilityMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, accessibilityId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加无障碍设施 ${accessibilityId}`);
      return { success: true };
    },
  });
};

// 移除无障碍设施映射
export const useRemoveAccessibilityMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, accessibilityId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除无障碍设施 ${accessibilityId}`);
      return { success: true };
    },
  });
};
