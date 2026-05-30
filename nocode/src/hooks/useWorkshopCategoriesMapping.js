import { useQuery, useMutation } from "@tanstack/react-query";

// 获取分类映射
export const useCategoriesMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopCategoriesMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { categoryId: 1, categoryName: "手工" },
        { categoryId: 2, categoryName: "传统工艺" },
      ];
    },
  });
};

// 添加分类映射
export const useAddCategoryMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, categoryId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加分类 ${categoryId}`);
      return { success: true };
    },
  });
};

// 移除分类映射
export const useRemoveCategoryMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, categoryId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除分类 ${categoryId}`);
      return { success: true };
    },
  });
};
