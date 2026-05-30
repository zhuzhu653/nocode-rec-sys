import { useQuery, useMutation } from "@tanstack/react-query";

// 获取照片映射
export const usePhotosMapping = (workshopId) => {
  return useQuery({
    queryKey: ["workshopPhotosMapping", workshopId],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        { photoId: 1, url: "https://nocode.meituan.com/photo/search?keyword=pottery,workshop&width=600&height=400" },
        { photoId: 2, url: "https://nocode.meituan.com/photo/search?keyword=pottery,clay&width=600&height=400" },
      ];
    },
  });
};

// 添加照片映射
export const useAddPhotoMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, photoId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`为工作坊 ${workshopId} 添加照片 ${photoId}`);
      return { success: true };
    },
  });
};

// 移除照片映射
export const useRemovePhotoMapping = () => {
  return useMutation({
    mutationFn: async ({ workshopId, photoId }) => {
      // 实际应用中这里会调用API
      // 模拟API调用
      console.log(`从工作坊 ${workshopId} 移除照片 ${photoId}`);
      return { success: true };
    },
  });
};
