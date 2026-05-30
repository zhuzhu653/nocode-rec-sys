import { useQuery } from "@tanstack/react-query";

// 获取价格区间
export const usePriceRanges = () => {
  return useQuery({
    queryKey: ["workshopPriceRanges"],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { min: 0, max: 100, label: "100元以下" },
        { min: 100, max: 200, label: "100-200元" },
        { min: 200, max: 300, label: "200-300元" },
        { min: 300, max: 500, label: "300-500元" },
        { min: 500, max: 1000, label: "500元以上" },
      ];
    },
  });
};
