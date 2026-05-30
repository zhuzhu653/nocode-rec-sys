import { useQuery, useMutation } from "@tanstack/react-query";

// 获取区域映射
export const useAreasMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopAreasMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { areaId: 1, areaName: "朝阳区" },
        { areaId: 2, areaName: "798艺术区" },
      ];
    },
  });
};

// 添加区域映射
export const useAddAreaMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, areaId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加区域 ${areaId}`);
      return { success: true };
    },
  });
};

// 移除区域映射
export const useRemoveAreaMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, areaId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除区域 ${areaId}`);
      return { success: true };
    },
  });
};
