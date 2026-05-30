import { useQuery, useMutation } from "@tanstack/react-query";

// 创建支付订单
export const useCreatePaymentOrder = () => {
  return useMutation({
    mutationFn: async (paymentData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("支付信息:", paymentData);
      return { 
        success: true, 
        paymentUrl: "https://payment.example.com/pay/123456" 
      };
    },
  });
};

// 查询支付状态
export const usePaymentStatus = (orderId) => {
  return useQuery({
    queryKey: ["paymentStatus", orderId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return {
        status: "success",
        amount: 199,
        paidAt: "2023-12-10T10:30:00Z",
      };
    },
  });
};
