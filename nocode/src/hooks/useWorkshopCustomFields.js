import { useQuery, useMutation } from "@tanstack/react-query";

// 获取自定义字段
export const useCustomFields = (workshopId) => {
  return useQuery({
    queryKey: ["workshopCustomFields", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          fieldName: "difficulty",
          fieldType: "select",
          fieldValue: "beginner",
        },
        {
          id: 2,
          fieldName: "materials",
          fieldType: "text",
          fieldValue: "陶土、工具、釉料",
        },
      ];
    },
  });
};

// 更新自定义字段
export const useUpdateCustomField = () => {
  return useMutation({
    mutationFn: async (fieldData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("更新自定义字段:", fieldData);
      return { success: true };
    },
  });
};
