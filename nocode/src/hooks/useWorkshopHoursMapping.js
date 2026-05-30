import { useQuery, useMutation } from "@tanstack/react-query";

// 获取营业时间映射
export const useHoursMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopHoursMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { hoursId: 1, hoursName: "工作日营业" },
        { hoursId: 2, hoursName: "周末营业" },
      ];
    },
  });
};

// 添加营业时间映射
export const useAddHoursMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, hoursId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加营业时间 ${hoursId}`);
      return { success: true };
    },
  });
};

// 移除营业时间映射
export const useRemoveHoursMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, hoursId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除营业时间 ${hoursId}`);
      return { success: true };
    },
  });
};
