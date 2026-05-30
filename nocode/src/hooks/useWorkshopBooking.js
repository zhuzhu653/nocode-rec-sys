import { useQuery, useMutation } from "@tanstack/react-query";

// 预约工作坊
export const useBookWorkshop = () => {
  return useMutation({
    mutationFn: async (bookingData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("预约信息:", bookingData);
      return { success: true, message: "预约成功" };
    },
  });
};

// 获取用户预约记录
export const useUserBookings = (userId) => {
  return useQuery({
    queryKey: ["userBookings", userId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          workshopId: 1,
          workshopTitle: "手工陶艺体验课",
          date: "2023-12-15",
          status: "已确认",
        },
        {
          id: 2,
          workshopId: 3,
          workshopTitle: "木工制作体验",
          date: "2023-12-25",
          status: "已确认",
        },
      ];
    },
  });
};
