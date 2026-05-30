import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import InstructorSearch from "../components/InstructorSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Users, BookOpen } from "lucide-react";
import { searchInstructors } from "../integrations/supabase/client";

const Instructors = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  // 从Supabase获取达人数据
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors", searchQuery, sortBy],
    queryFn: async () => {
      return await searchInstructors(searchQuery, sortBy);
    },
  });

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleViewDetail = (instructorId) => {
    navigate(`/instructor/${instructorId}`);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      
      <div className="container py-8">
        <motion.h1 
          className="text-3xl font-light mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          匠心达人 - 达人
        </motion.h1>
        
        {/* 搜索和筛选栏 */}
        <InstructorSearch onSearch={handleSearch} />
        
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select
            className="rounded-full border-[#e8e3db] bg-[#f9f7f3] px-4 py-2 text-[#666]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="rating">按评分排序</option>
            <option value="workshops">按工作坊数排序</option>
            <option value="students">按学员数排序</option>
          </select>
        </div>
        
        {/* 达人列表 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors?.map((instructor, index) => (
              <motion.div
                key={instructor.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={instructor.avatar}
                      alt={instructor.name}
                      className="h-16 w-16 rounded-full object-cover mr-4"
                    />
                    <div>
                      <h3 className="font-medium text-[#333]">{instructor.name}</h3>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-[#d4a373] fill-current" />
                        <span className="text-sm text-[#666] ml-1">{instructor.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-[#666] mb-4 line-clamp-2">{instructor.bio}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {instructor.expertise?.map((skill, i) => (
                      <span
                        key={i}
                        className="bg-[#e8e3db] text-[#666] text-xs px-2 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-sm text-[#666] mb-4">
                    <MapPin className="h-4 w-4 mr-1 text-[#d4a373]" />
                    <span>{instructor.location}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-[#f9f7f3] rounded-lg">
                      <div className="flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-[#d4a373] mr-1" />
                        <span className="text-sm font-medium">{instructor.workshop_count}</span>
                      </div>
                      <p className="text-xs text-[#999]">工作坊</p>
                    </div>
                    <div className="text-center p-2 bg-[#f9f7f3] rounded-lg">
                      <div className="flex items-center justify-center">
                        <Users className="h-4 w-4 text-[#d4a373] mr-1" />
                        <span className="text-sm font-medium">{instructor.student_count}</span>
                      </div>
                      <p className="text-xs text-[#999]">学员</p>
                    </div>
                    <div className="text-center p-2 bg-[#f9f7f3] rounded-lg">
                      <div className="flex items-center justify-center">
                        <Star className="h-4 w-4 text-[#d4a373] mr-1" />
                        <span className="text-sm font-medium">{instructor.rating}</span>
                      </div>
                      <p className="text-xs text-[#999]">评分</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#333] mb-2">开设课程</h4>
                    <div className="space-y-2">
                      {instructor.workshops?.slice(0, 2).map((workshop) => (
                        <div key={workshop.id} className="flex items-center">
                          <img
                            src={workshop.image}
                            alt={workshop.title}
                            className="h-10 w-10 rounded-md object-cover mr-2"
                          />
                          <div>
                            <p className="text-xs font-medium text-[#333]">{workshop.title}</p>
                            <p className="text-xs text-[#999]">¥{workshop.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#333] mb-2">帖文</h4>
                    <div className="space-y-2">
                      {instructor.stories?.slice(0, 1).map((story) => (
                        <div key={story.id} className="flex items-center">
                          <img
                            src={story.image}
                            alt={story.title}
                            className="h-10 w-10 rounded-md object-cover mr-2"
                          />
                          <div>
                            <p className="text-xs font-medium text-[#333]">{story.title}</p>
                            <p className="text-xs text-[#999]">{story.likes} 赞 · {story.comments} 评论</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-[#333] mb-2">推荐路线</h4>
                    <div className="space-y-2">
                      {instructor.routes?.slice(0, 1).map((route) => (
                        <div key={route.id} className="flex items-center">
                          <img
                            src={route.image}
                            alt={route.name}
                            className="h-10 w-10 rounded-md object-cover mr-2"
                          />
                          <div>
                            <p className="text-xs font-medium text-[#333]">{route.name}</p>
                            <p className="text-xs text-[#999]">{route.points} 个点位</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
                    onClick={() => handleViewDetail(instructor.id)}
                  >
                    查看详情
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Instructors;
