import { useQuery, useMutation } from "@tanstack/react-query";

// 获取反馈映射
export const useFeedbackMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopFeedbackMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { feedbackId: 1, feedbackType: "建议", message: "希望能增加更多陶艺技法" },
        { feedbackId: 2, feedbackType: "问题", message: "预约系统有点复杂" },
      ];
    },
  });
};

// 添加反馈映射
export const useAddFeedbackMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, feedbackId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加反馈 ${feedbackId}`);
      return { success: true };
    },
  });
};

// 移除反馈映射
export const useRemoveFeedbackMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, feedbackId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除反馈 ${feedbackId}`);
      return { success: true };
    },
  });
};
