import { useQuery, useMutation } from "@tanstack/react-query";

// 获取访客映射
export const useVisitorsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopVisitorsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { visitorId: 1, visitTime: "2023-12-15T10:30:00Z", duration: 120, deviceInfo: "iPhone 13" },
        { visitorId: 2, visitTime: "2023-12-16T14:15:00Z", duration: 90, deviceInfo: "iPad Pro" },
      ];
    },
  });
};

// 添加访客映射
export const useAddVisitorMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, visitorId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加访客 ${visitorId}`);
      return { success: true };
    },
  });
};

// 移除访客映射
export const useRemoveVisitorMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, visitorId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除访客 ${visitorId}`);
      return { success: true };
    },
  });
};
