import { useQuery, useMutation } from "@tanstack/react-query";

// 获取建议映射
export const useSuggestionsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopSuggestionsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { suggestionId: 1, name: "增加更多陶艺技法" },
        { suggestionId: 2, name: "延长工作坊时间" },
      ];
    },
  });
};

// 添加建议映射
export const useAddSuggestionMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, suggestionId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加建议 ${suggestionId}`);
      return { success: true };
    },
  });
};

// 移除建议映射
export const useRemoveSuggestionMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, suggestionId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除建议 ${suggestionId}`);
      return { success: true };
    },
  });
};
