import { useQuery, useMutation } from "@tanstack/react-query";

// 获取用户收藏的工作坊
export const useUserFavorites = (userId) => {
  return useQuery({
    queryKey: ["userFavorites", userId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          title: "手工陶艺体验课",
          price: 199,
          image: "https://nocode.meituan.com/photo/search?keyword=pottery,workshop&width=300&height=200",
        },
        {
          id: 3,
          title: "木工制作体验",
          price: 249,
          image: "https://nocode.meituan.com/photo/search?keyword=woodworking,craft&width=300&height=200",
        },
      ];
    },
  });
};

// 添加收藏
export const useAddFavorite = () => {
  return useMutation({
    mutationFn: async ({ userId, workshopId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`用户 ${userId} 收藏工作坊 ${workshopId}`);
      return { success: true };
    },
  });
};

// 取消收藏
export const useRemoveFavorite = () => {
  return useMutation({
    mutationFn: async ({ userId, workshopId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`用户 ${userId} 取消收藏工作坊 ${workshopId}`);
      return { success: true };
    },
  });
};
