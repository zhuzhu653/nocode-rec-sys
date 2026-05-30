import { useQuery, useMutation } from "@tanstack/react-query";

// 获取互动映射
export const useEngagementMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopEngagementMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { engagementId: 1, engagementType: "点赞", metadata: { userId: "user123" } },
        { engagementId: 2, engagementType: "评论", metadata: { userId: "user456", comment: "很棒的工作坊" } },
      ];
    },
  });
};

// 添加互动映射
export const useAddEngagementMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, engagementId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加互动 ${engagementId}`);
      return { success: true };
    },
  });
};

// 移除互动映射
export const useRemoveEngagementMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, engagementId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除互动 ${engagementId}`);
      return { success: true };
    },
  });
};
