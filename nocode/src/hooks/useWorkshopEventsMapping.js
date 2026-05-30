import { useQuery, useMutation } from "@tanstack/react-query";

// 获取活动映射
export const useEventsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopEventsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { eventId: 1, eventName: "陶艺展览" },
        { eventId: 2, eventName: "作品展示" },
      ];
    },
  });
};

// 添加活动映射
export const useAddEventMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, eventId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加活动 ${eventId}`);
      return { success: true };
    },
  });
};

// 移除活动映射
export const useRemoveEventMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, eventId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除活动 ${eventId}`);
      return { success: true };
    },
  });
};
