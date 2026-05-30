import { useQuery, useMutation } from "@tanstack/react-query";

// 更新工作坊库存
export const useUpdateWorkshopInventory = () => {
  return useMutation({
    mutationFn: async ({ workshopId, seatsChange }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`更新工作坊 ${workshopId} 库存，变化: ${seatsChange}`);
      return { success: true };
    },
  });
};

// 检查工作坊库存
export const useCheckWorkshopInventory = (workshopId) => {
  return useQuery({
    queryKey: ["workshopInventory", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return {
        totalSeats: 20,
        remainingSeats: 8,
        isAvailable: true,
      };
    },
  });
};
