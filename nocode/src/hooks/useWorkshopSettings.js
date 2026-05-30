import { useQuery, useMutation } from "@tanstack/react-query";

// 获取工作坊设置
export const useWorkshopSettings = (workshopId) => {
  return useQuery({
    queryKey: ["workshopSettings", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return {
        allowReviews: true,
        maxParticipants: 20,
        cancellationPolicy: "48小时前可取消",
        refundPolicy: "7天内可退款",
      };
    },
  });
};

// 更新工作坊设置
export const useUpdateWorkshopSettings = () => {
  return useMutation({
    mutationFn: async (settingsData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("更新设置:", settingsData);
      return { success: true };
    },
  });
};
