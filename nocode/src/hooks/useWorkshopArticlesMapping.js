import { useQuery, useMutation } from "@tanstack/react-query";

// 获取文章映射
export const useArticlesMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopArticlesMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { articleId: 1, title: "陶艺的历史与文化" },
        { articleId: 2, title: "陶艺技法详解" },
      ];
    },
  });
};

// 添加文章映射
export const useAddArticleMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, articleId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加文章 ${articleId}`);
      return { success: true };
    },
  });
};

// 移除文章映射
export const useRemoveArticleMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, articleId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除文章 ${articleId}`);
      return { success: true };
    },
  });
};
