import { useQuery, useMutation } from "@tanstack/react-query";

// 获取设施映射
export const useAmenitiesMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopAmenitiesMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { amenityId: 1, amenityName: "停车场" },
        { amenityId: 2, amenityName: "WiFi" },
        { amenityId: 3, amenityName: "休息区" },
      ];
    },
  });
};

// 添加设施映射
export const useAddAmenityMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, amenityId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加设施 ${amenityId}`);
      return { success: true };
    },
  });
};

// 移除设施映射
export const useRemoveAmenityMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, amenityId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除设施 ${amenityId}`);
      return { success: true };
    },
  });
};
