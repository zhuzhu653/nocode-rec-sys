import { useQuery, useMutation } from "@tanstack/react-query";

// 获取搜索映射
export const useSearchMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopSearchMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { searchId: 1, query: "陶艺", resultsCount: 15 },
        { searchId: 2, query: "手工", resultsCount: 20 },
      ];
    },
  });
};

// 添加搜索映射
export const useAddSearchMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, searchId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加搜索数据 ${searchId}`);
      return { success: true };
    },
  });
};

// 移除搜索映射
export const useRemoveSearchMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, searchId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除搜索数据 ${searchId}`);
      return { success: true };
    },
  });
};
