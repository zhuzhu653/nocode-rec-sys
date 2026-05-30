import { useQuery } from "@tanstack/react-query";
import Header from "../components/Header";
import WorkshopDetailContent from "../components/WorkshopDetailContent";
import { useParams } from "react-router-dom";
import { getWorkshopById } from "@/integrations/supabase/client";

const WorkshopDetail = () => {
  const { id } = useParams();
          
  // 从数据库获取工作坊详情数据
  const { data: workshop, isLoading, error } = useQuery({
    queryKey: ["workshopDetail", id],
    queryFn: async () => {
      if (!id) throw new Error("工作坊ID不能为空");
      return await getWorkshopById(id);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="h-80 rounded-2xl bg-[#e8e3db] animate-pulse mb-8"></div>
          <div className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p className="font-bold">数据加载失败</p>
            <p>无法获取工作坊详情，请检查网络连接或联系管理员。</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
            <p>未找到对应的工作坊</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      <WorkshopDetailContent workshop={workshop} />
    </div>
  );
};

export default WorkshopDetail;
