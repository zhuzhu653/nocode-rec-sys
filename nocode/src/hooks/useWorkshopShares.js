import { useMutation } from "@tanstack/react-query";

// 分享工作坊
export const useShareWorkshop = () => {
  return useMutation({
    mutationFn: async (shareData) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log("分享信息:", shareData);
      return { 
        success: true, 
        shareUrl: "https://workshop.example.com/share/123456" 
      };
    },
  });
};
