import { useQuery } from "@tanstack/react-query";

// 获取推荐工作坊
export const useWorkshopRecommendations = (workshopId) => {
  return useQuery({
    queryKey: ["workshopRecommendations", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 2,
          title: "水彩画入门课程",
          price: 299,
          image: "https://nocode.meituan.com/photo/search?keyword=watercolor,painting&width=300&height=200",
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
