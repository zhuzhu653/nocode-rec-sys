import { useQuery } from "@tanstack/react-query";

// 获取用户权限
export const useUserPermissions = (userId) => {
  return useQuery({
    queryKey: ["userPermissions", userId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { resource: "workshop", permission: "read" },
        { resource: "workshop", permission: "write" },
        { resource: "order", permission: "read" },
      ];
    },
  });
};

// 检查特定权限
export const useCheckPermission = (userId, resource, permission) => {
  return useQuery({
    queryKey: ["checkPermission", userId, resource, permission],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return true;
    },
  });
};
