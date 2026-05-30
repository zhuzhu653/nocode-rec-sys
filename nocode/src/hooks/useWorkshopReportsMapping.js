import { useQuery, useMutation } from "@tanstack/react-query";

// 获取举报映射
export const useReportsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopReportsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { reportId: 1, reportType: "内容不当", message: "图片内容不适合儿童" },
        { reportId: 2, reportType: "价格欺诈", message: "实际价格与宣传不符" },
      ];
    },
  });
};

// 添加举报映射
export const useAddReportMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, reportId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加举报 ${reportId}`);
      return { success: true };
    },
  });
};

// 移除举报映射
export const useRemoveReportMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, reportId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除举报 ${reportId}`);
      return { success: true };
    },
  });
};
