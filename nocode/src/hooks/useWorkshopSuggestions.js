import { useMutation } from "@tanstack/react-query";

// 提交建议
export const useSubmitSuggestion = () => {
  return useMutation({
    mutationFn: async (suggestionData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("建议信息:", suggestionData);
      return { success: true, message: "建议提交成功" };
    },
  });
};
