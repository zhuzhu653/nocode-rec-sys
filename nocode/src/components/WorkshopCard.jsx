import { motion } from "framer-motion";
import { Calendar, MapPin, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const WorkshopCard = ({ workshop, index = 0 }) => {
  return (
    <motion.div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative h-48">
        <img 
          src={workshop.image} 
          alt={workshop.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
          {workshop.category}
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-medium text-[#333] mb-2">{workshop.title}</h3>
        <p className="text-[#666] text-sm mb-4 line-clamp-2">{workshop.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src={`https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32`}
              alt={workshop.instructor}
              className="h-6 w-6 rounded-full object-cover mr-2"
            />
            <span className="text-sm text-[#666]">{workshop.instructor}</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-[#d4a373] mr-1" />
            <span className="text-sm text-[#666]">{workshop.rating}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-[#666]">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{workshop.date}</span>
          </div>
          <div className="flex items-center text-sm text-[#666]">
            <Users className="h-4 w-4 mr-1" />
            <span>{workshop.remainingSeats}/{workshop.totalSeats} 席位</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-[#d4a373]">¥{workshop.price}</span>
          <Button className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full">
            立即预约
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkshopCard;
