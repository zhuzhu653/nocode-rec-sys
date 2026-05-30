import { useMutation } from "@tanstack/react-query";

// 举报工作坊
export const useReportWorkshop = () => {
  return useMutation({
    mutationFn: async (reportData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("举报信息:", reportData);
      return { success: true, message: "举报提交成功" };
    },
  });
};
