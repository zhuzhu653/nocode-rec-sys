import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Star, Users, BookOpen, Heart, Share2, ArrowLeft } from "lucide-react";
import { getInstructorById, checkUserFollowsInstructor, followInstructor, unfollowInstructor } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import LoginPrompt from "@/components/LoginPrompt"; // 导入统一的登录提示组件

const InstructorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // 添加登录提示状态

  // 从Supabase获取达人详情数据
  const { data: instructor, isLoading } = useQuery({
    queryKey: ["instructorDetail", id],
    queryFn: async () => {
      if (!id) throw new Error("达人ID不能为空");
      return await getInstructorById(id);
    },
  });

  // 检查用户是否已关注该达人
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (user && instructor) {
        try {
          const isFollowing = await checkUserFollowsInstructor(user.id, instructor.id);
          setIsFollowing(isFollowing);
        } catch (error) {
          console.error('检查关注状态错误:', error);
        }
      }
    };

    checkFollowStatus();
  }, [user, instructor]);

  // 使用useMutation处理关注操作
  const followMutation = useMutation({
    mutationFn: async ({ instructorId, isCurrentlyFollowing }) => {
      if (isCurrentlyFollowing) {
        // 取消关注
        await unfollowInstructor(user.id, instructorId);
      } else {
        // 关注
        await followInstructor(user.id, instructorId);
      }
    },
    onMutate: async ({ instructorId, isCurrentlyFollowing }) => {
      // 乐观更新：立即更新UI
      setIsFollowing(!isCurrentlyFollowing);

      // 保存旧状态以便出错时回滚
      return { previousIsFollowing: isCurrentlyFollowing };
    },
    onError: (error, variables, context) => {
      console.error('关注操作失败:', error);
      // 出错时回滚到之前的状态
      setIsFollowing(context.previousIsFollowing);
      alert('操作失败，请重试');
    },
    onSuccess: () => {
      // 操作成功后刷新相关数据
      queryClient.invalidateQueries(["followingInstructors", user?.id]);
      queryClient.invalidateQueries(["instructorDetail", id]);
    },
    onSettled: () => {
      setIsLoadingFollow(false);
    }
  });

  // 统一的登录提示处理函数
  const showLoginPromptIfNeeded = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return true;
    }
    return false;
  };

  // 处理登录跳转
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/auth');
  };

  const handleFollow = async () => {
    if (showLoginPromptIfNeeded()) return;

    if (!instructor) return;

    setIsLoadingFollow(true);

    // 使用mutation处理关注操作
    followMutation.mutate({
      instructorId: instructor.id,
      isCurrentlyFollowing: isFollowing
    });
  };

  const handleShare = () => {
    // 实际应用中这里会调用分享API
    console.log(`分享达人 ${instructor?.name}`);
  };

  const handleBack = () => {
    navigate('/instructors');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse mb-8"></div>
          <div className="h-32 rounded-2xl bg-[#e8e3db] animate-pulse mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      
      <div className="container py-8">
        {/* 返回按钮 */}
        <button
          onClick={handleBack}
          className="flex items-center text-[#666] hover:text-[#d4a373] mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回达人列表
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 封面图片 */}
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
            <img
              src={instructor?.cover_image || "https://nocode.meituan.com/photo/search?keyword=pottery,studio&width=800&height=300"}
              alt={instructor?.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-6 left-6 flex items-end">
              <img
                src={instructor?.avatar}
                alt={instructor?.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-white mr-4"
              />
              <div>
                <h1 className="text-3xl font-medium text-white">{instructor?.name}</h1>
                <div className="flex items-center mt-2">
                  <Star className="h-5 w-5 text-[#d4a373] fill-current" />
                  <span className="text-white ml-1">{instructor?.rating}</span>
                  <span className="text-white/80 ml-2">({instructor?.workshop_count} 个工作坊)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 mb-8">
            <Button
              variant={isFollowing ? "outline" : "default"}
              className={isFollowing 
                ? "border-[#e8e3db] text-[#666]" 
                : "bg-[#d4a373] hover:bg-[#c99a67] text-white"
              }
              onClick={handleFollow}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "已关注" : "关注"}
            </Button>
            <Button variant="outline" className="border-[#e8e3db] text-[#666]" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
          </div>
          
          {/* 达人简介 */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-medium text-[#333] mb-4">达人介绍</h2>
              <p className="text-[#666] mb-4">{instructor?.bio}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {instructor?.expertise?.map((skill, i) => (
                  <span
                    key={i}
                    className="bg-[#e8e3db] text-[#666] text-sm px-3 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center text-[#666]">
                <MapPin className="h-4 w-4 mr-2 text-[#d4a373]" />
                <span>{instructor?.location}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-[#d4a373] mr-2" />
                  <span className="text-2xl font-medium">{instructor?.workshop_count}</span>
                </div>
                <p className="text-[#666] mt-2">工作坊</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center">
                  <Users className="h-6 w-6 text-[#d4a373] mr-2" />
                  <span className="text-2xl font-medium">{instructor?.student_count}</span>
                </div>
                <p className="text-[#666] mt-2">学员</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center">
                  <Star className="h-6 w-6 text-[#d4a373] mr-2" />
                  <span className="text-2xl font-medium">{instructor?.rating}</span>
                </div>
                <p className="text-[#666] mt-2">评分</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 开设课程 */}
          <section className="mb-12">
            <h2 className="text-2xl font-light mb-6">开设课程</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructor?.workshops?.map((workshop, index) => (
                <motion.div
                  key={workshop.id}
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
                      ¥{workshop.price}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-medium text-[#333] mb-2">{workshop.title}</h3>
                    <div className="flex items-center text-sm text-[#666] mb-3">
                      <Calendar className="h-4 w-4 mr-1 text-[#d4a373]" />
                      <span>{workshop.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-[#d4a373] fill-current mr-1" />
                        <span className="text-sm text-[#666]">{workshop.rating}</span>
                        <span className="text-sm text-[#999] ml-2">({workshop.student_count}人)</span>
                      </div>
                      <Button
                        className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full text-sm"
                        onClick={() => navigate(`/booking/${workshop.id}`)}
                      >
                        立即预约
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* 达人帖文 */}
          <section className="mb-12">
            <h2 className="text-2xl font-light mb-6">达人帖文</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {instructor?.stories?.map((story, index) => (
                <motion.div
                  key={story.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="font-medium text-[#333] mb-2">{story.title}</h3>
                    <p className="text-sm text-[#666] mb-4 line-clamp-3">{story.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#999]">{story.created_at?.split('T')[0]}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-[#999]">
                          <Heart className="h-4 w-4 mr-1" />
                          <span className="text-xs">{story.likes}</span>
                        </div>
                        <div className="flex items-center text-[#999]">
                          <span className="text-xs">{story.comments} 评论</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* 推荐路线 */}
          <section>
            <h2 className="text-2xl font-light mb-6">推荐路线</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {instructor?.routes?.map((route, index) => (
                <motion.div
                  key={route.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex">
                    <img
                      src={route.image}
                      alt={route.name}
                      className="h-32 w-32 object-cover"
                    />
                    <div className="flex-1 p-4">
                      <h3 className="font-medium text-[#333] mb-2">{route.name}</h3>
                      <p className="text-sm text-[#666] mb-3">{route.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#999]">{route.points} 个点位</span>
                        <Button size="sm" variant="outline" className="rounded-full text-xs">
                          查看路线
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </motion.div>
      </div>

      {/* 使用统一的登录提示组件 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginRedirect}
        title="请先登录"
        message="登录后才可以关注达人"
      />
    </div>
  );
};

export default InstructorDetail;
