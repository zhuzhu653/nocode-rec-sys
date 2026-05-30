import { useQuery, useMutation } from "@tanstack/react-query";

// 获取标签映射
export const useTagsMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopTagsMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { tagId: 1, tagName: "手工制作" },
        { tagId: 2, tagName: "陶艺" },
        { tagId: 3, tagName: "体验课" },
      ];
    },
  });
};

// 添加标签映射
export const useAddTagMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, tagId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加标签 ${tagId}`);
      return { success: true };
    },
  });
};

// 移除标签映射
export const useRemoveTagMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, tagId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除标签 ${tagId}`);
      return { success: true };
    },
  });
};
