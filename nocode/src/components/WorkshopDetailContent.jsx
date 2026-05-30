import WorkshopImageCarousel from "./WorkshopImageCarousel";
import WorkshopInfo from "./WorkshopInfo";
import WorkshopInstructor from "./WorkshopInstructor";
import WorkshopRecommendations from "./WorkshopRecommendations";
import WorkshopBookingForm from "./WorkshopBookingForm";

const WorkshopDetailContent = ({ workshop }) => {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-light mb-6">{workshop.title}</h1>
      
      <WorkshopImageCarousel images={workshop.images} title={workshop.title} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧内容区 */}
        <div className="lg:col-span-2 space-y-8">
          <WorkshopInfo workshop={workshop} />
          <WorkshopInstructor instructor={workshop.instructor} />
          <WorkshopRecommendations workshops={workshop.relatedWorkshops} />
        </div>
        
        {/* 右侧预约区 */}
        <div className="lg:col-span-1">
          <WorkshopBookingForm workshop={workshop} />
        </div>
      </div>
    </div>
  );
};

export default WorkshopDetailContent;
