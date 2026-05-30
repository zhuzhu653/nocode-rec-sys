import { useQuery, useMutation } from "@tanstack/react-query";

// 获取价格信息映射
export const usePricingMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopPricingMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { pricingId: 1, pricingName: "早鸟优惠" },
        { pricingId: 2, pricingName: "团体优惠" },
      ];
    },
  });
};

// 添加价格信息映射
export const useAddPricingMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, pricingId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加价格信息 ${pricingId}`);
      return { success: true };
    },
  });
};

// 移除价格信息映射
export const useRemovePricingMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, pricingId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除价格信息 ${pricingId}`);
      return { success: true };
    },
  });
};
