import { useQuery } from "@tanstack/react-query";

// 获取工作坊审计记录
export const useWorkshopAudit = (workshopId) => {
  return useQuery({
    queryKey: ["workshopAudit", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          action: "create",
          userId: "admin",
          metadata: { title: "手工陶艺体验课" },
          createdAt: "2023-12-01T10:00:00Z",
        },
        {
          id: 2,
          action: "update",
          userId: "admin",
          metadata: { description: "更新描述信息" },
          createdAt: "2023-12-05T14:30:00Z",
        },
        {
          id: 3,
          action: "publish",
          userId: "admin",
          metadata: {},
          createdAt: "2023-12-10T09:00:00Z",
        },
      ];
    },
  });
};
