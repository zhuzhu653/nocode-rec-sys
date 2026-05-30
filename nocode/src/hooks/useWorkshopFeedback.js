import { useMutation } from "@tanstack/react-query";

// 提交反馈
export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: async (feedbackData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("反馈信息:", feedbackData);
      return { success: true, message: "反馈提交成功" };
    },
  });
};
