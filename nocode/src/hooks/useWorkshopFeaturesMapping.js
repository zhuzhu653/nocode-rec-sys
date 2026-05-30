import { useQuery, useMutation } from "@tanstack/react-query";

// 获取特色映射
export const useFeaturesMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopFeaturesMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { featureId: 1, featureName: "专业指导" },
        { featureId: 2, featureName: "材料提供" },
        { featureId: 3, featureName: "作品带走" },
      ];
    },
  });
};

// 添加特色映射
export const useAddFeatureMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, featureId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加特色 ${featureId}`);
      return { success: true };
    },
  });
};

// 移除特色映射
export const useRemoveFeatureMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, featureId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除特色 ${featureId}`);
      return { success: true };
    },
  });
};
