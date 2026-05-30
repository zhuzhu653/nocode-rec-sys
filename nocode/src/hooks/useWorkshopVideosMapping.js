import { useQuery, useMutation } from "@tanstack/react-query";

// 获取视频映射
export const useVideosMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopVideosMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { videoId: 1, url: "https://example.com/videos/pottery-workshop.mp4" },
        { videoId: 2, url: "https://example.com/videos/pottery-demonstration.mp4" },
      ];
    },
  });
};

// 添加视频映射
export const useAddVideoMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, videoId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加视频 ${videoId}`);
      return { success: true };
    },
  });
};

// 移除视频映射
export const useRemoveVideoMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, videoId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除视频 ${videoId}`);
      return { success: true };
    },
  });
};
