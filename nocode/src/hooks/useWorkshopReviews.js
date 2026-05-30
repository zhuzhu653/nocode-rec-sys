import { useQuery, useMutation } from "@tanstack/react-query";

// 获取工作坊评价
export const useWorkshopReviews = (workshopId) => {
  return useQuery({
    queryKey: ["workshopReviews", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          userId: "user123",
          userName: "艺术爱好者",
          rating: 5,
          comment: "非常棒的工作坊，张老师讲解很详细，学到了很多陶艺知识。",
          createdAt: "2023-12-16",
        },
        {
          id: 2,
          userId: "user456",
          userName: "手工达人",
          rating: 4,
          comment: "整体不错，就是时间有点短，希望能有更多练习时间。",
          createdAt: "2023-12-17",
        },
        {
          id: 3,
          userId: "user789",
          userName: "初学者",
          rating: 5,
          comment: "零基础也能学会，老师很有耐心，作品很满意。",
          createdAt: "2023-12-18",
        },
      ];
    },
  });
};

// 提交评价
export const useSubmitReview = () => {
  return useMutation({
    mutationFn: async (reviewData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("评价信息:", reviewData);
      return { success: true, message: "评价提交成功" };
    },
  });
};
