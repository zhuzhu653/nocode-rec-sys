import { Calendar, MapPin, Star, Users, Heart, Share2 } from "lucide-react";

const WorkshopInfo = ({ workshop }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img 
            src={workshop.instructors.avatar}
            alt={workshop.instructors.name}
            className="h-12 w-12 rounded-full object-cover mr-4"
          />
          <div>
            <h3 className="font-medium text-[#333]">{workshop.instructor.name}</h3>
            <p className="text-sm text-[#666]">陶艺大师</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-[#e8e3db] transition-colors">
            <Heart className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-[#e8e3db] transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center text-sm text-[#666]">
          <Calendar className="h-4 w-4 mr-2 text-[#d4a373]" />
          <span>{workshop.date} {workshop.time}</span>
        </div>
        <div className="flex items-center text-sm text-[#666]">
          <MapPin className="h-4 w-4 mr-2 text-[#d4a373]" />
          <span>{workshop.location}</span>
        </div>
        <div className="flex items-center text-sm text-[#666]">
          <Star className="h-4 w-4 mr-2 text-[#d4a373]" />
          <span>{workshop.rating} 评分</span>
        </div>
        <div className="flex items-center text-sm text-[#666]">
          <Users className="h-4 w-4 mr-2 text-[#d4a373]" />
          <span>{workshop.remainingSeats}/{workshop.totalSeats} 席位</span>
        </div>
      </div>
      
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: workshop.content }}
      />
    </div>
  );
};

export default WorkshopInfo;
