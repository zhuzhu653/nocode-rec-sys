import { useQuery, useMutation } from "@tanstack/react-query";

// 获取联系信息映射
export const useContactMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopContactMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { contactId: 1, contactName: "电话联系" },
        { contactId: 2, contactName: "微信联系" },
      ];
    },
  });
};

// 添加联系信息映射
export const useAddContactMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, contactId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加联系信息 ${contactId}`);
      return { success: true };
    },
  });
};

// 移除联系信息映射
export const useRemoveContactMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, contactId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除联系信息 ${contactId}`);
      return { success: true };
    },
  });
};
