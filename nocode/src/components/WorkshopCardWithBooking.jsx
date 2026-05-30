import { motion } from "framer-motion";
import { Calendar, MapPin, Star, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const WorkshopCardWithBooking = ({ workshop, index = 0 }) => {
  const navigate = useNavigate();

  const handleBooking = () => {
    // 跳转到预约详情页面
    navigate(`/booking/${workshop.id}`);
  };

  // 从数据库字段映射到组件期望的字段
  const workshopData = {
    id: workshop.id,
    title: workshop.title,
    description: workshop.description,
    price: workshop.price,
    instructor: workshop.instructors ? {
      name: workshop.instructors.name,
      avatar: workshop.instructors.avatar,
      rating: workshop.instructors.rating || 4.8 // 使用数据库中的评分或默认值
    } : {
      name: "未知讲师",
      avatar: "https://nocode.meituan.com/photo/search?keyword=avatar&width=100&height=100",
      rating: 4.8
    },
    rating: workshop.rating || 4.5, // 使用数据库中的评分或默认值
    totalSeats: workshop.total_seats,
    remainingSeats: workshop.remaining_seats,
    date: workshop.open_date ? new Date(workshop.open_date).toLocaleDateString('zh-CN') : "待定",
    time: workshop.duration_minutes ? `${Math.floor(workshop.duration_minutes / 60)}小时${workshop.duration_minutes % 60}分钟` : "2小时",
    location: workshop.location || workshop.address || "位置待定",
    image: workshop.detail_images && workshop.detail_images.length > 0
      ? workshop.detail_images[0]
      : "https://nocode.meituan.com/photo/search?keyword=workshop&width=400&height=300",
    category: workshop.workshop_categories ? workshop.workshop_categories.name : "其他",
    difficulty: workshop.difficulty_level || "beginner",
    reviewCount: workshop.review_count || 0,
    isRecommended: workshop.is_recommended || false,
    isPopular: workshop.is_popular || false,
  };

  // 难度级别翻译
  const difficultyMap = {
    'beginner': '初级',
    'intermediate': '中级',
    'advanced': '高级'
  };

  return (
    <motion.div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative h-48">
        <img 
          src={workshopData.image}
          alt={workshopData.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
          {workshopData.category}
        </div>

        {/* 推荐标签 */}
        {workshopData.isRecommended && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
            推荐
          </div>
        )}

        {/* 热门标签 */}
        {workshopData.isPopular && (
          <div className="absolute top-12 left-4 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
            热门
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-medium text-[#333] mb-2">{workshopData.title}</h3>
        <p className="text-[#666] text-sm mb-4 line-clamp-2">{workshopData.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src={workshopData.instructor.avatar}
              alt={workshopData.instructor.name}
              className="h-6 w-6 rounded-full object-cover mr-2"
            />
            <span className="text-sm text-[#666]">{workshopData.instructor.name}</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-[#d4a373] mr-1" />
            <span className="text-sm text-[#666]">{workshopData.rating}</span>
            <span className="text-xs text-[#999] ml-1">({workshopData.reviewCount})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-[#666]">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{workshopData.date}</span>
          </div>
          <div className="flex items-center text-sm text-[#666]">
            <Clock className="h-4 w-4 mr-1" />
            <span>{workshopData.time}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-[#666]">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="line-clamp-1">{workshopData.location}</span>
          </div>
          <div className="flex items-center text-sm text-[#666]">
            <Users className="h-4 w-4 mr-1" />
            <span>{workshopData.remainingSeats}/{workshopData.totalSeats} 席位</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            {difficultyMap[workshopData.difficulty] || workshopData.difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-[#d4a373]">¥{workshopData.price}</span>
          <Button 
            className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
            onClick={handleBooking}
          >
            立即预约
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkshopCardWithBooking;
