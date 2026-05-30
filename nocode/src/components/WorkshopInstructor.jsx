import { Button } from "@/components/ui/button";

const WorkshopInstructor = ({ instructor }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-medium mb-4">达人介绍</h2>
      <div className="flex items-start">
        <img 
          src={instructor?.avatar || "https://nocode.meituan.com/photo/search?keyword=instructor,avatar&width=80&height=80"}
          alt={instructor?.name || "达人"}
          className="h-20 w-20 rounded-full object-cover mr-6"
        />
        <div>
          <h3 className="font-medium text-[#333] mb-2">{instructor?.name || "达人"}</h3>
          <p className="text-[#666] mb-4">{instructor?.bio || "暂无介绍"}</p>
          <div className="flex space-x-4">
            <Button variant="outline" size="sm" className="rounded-full">
              关注
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              查看主页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopInstructor;
