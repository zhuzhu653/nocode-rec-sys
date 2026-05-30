import { motion } from 'framer-motion';
import { getUserLikedLocations, getUserPosts, getUserLikedRouteIds, getUserLikedRoutes, getLikedPosts, getUserLikedLocationIds, getUserProfile, getUserFollowingInstructors, getUserWorkshopBookings } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, BarChart3, TrendingUp, Wallet, Calendar, MapPin, Share2, Edit, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import DashboardPreview from '@/components/DashboardPreview';
import { Button } from '@/components/ui/button';
const UserCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("explorer");
  const { user, isAuthenticated } = useAuth();

  // 获取用户真实数据
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const profile = await getUserProfile(user.id);
        return {
          id: user.id,
          name: profile.display_name || user.user_metadata?.name || user.email?.split('@')[0] || "用户",
          avatar: profile.avatar_url || user.user_metadata?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=100&height=100",
          bio: profile.bio || user.user_metadata?.bio || "热爱探索城市中的创意角落，喜欢手工艺和传统文化",
          joinDate: new Date(user.created_at).toLocaleDateString('zh-CN'),
          followingCount: profile.following_count || 0,
          postCount: profile.post_count || 0,
          interactionCount: profile.interaction_count || 0
        };
      } catch (error) {
        console.error("获取用户资料失败:", error);
        return {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || "用户",
          avatar: user.user_metadata?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=100&height=100",
          bio: "热爱探索城市中的创意角落，喜欢手工艺和传统文化",
          joinDate: new Date(user.created_at).toLocaleDateString('zh-CN'),
          followingCount: 0,
          postCount: 0,
          interactionCount: 0
        };
      }
    },
    enabled: !!user
  });

  // 获取用户关注的达人数据（从数据库）
  const { data: followingInstructors, isLoading: followingLoading } = useQuery({
    queryKey: ["followingInstructors", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const instructors = await getUserFollowingInstructors(user.id);
        return instructors.map(instructor => ({
          id: instructor.id,
          name: instructor.name,
          avatar: instructor.avatar,
          expertise: instructor.expertise || [],
          followers: instructor.follower_count || 0
        }));
      } catch (error) {
        console.error('获取关注达人失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 从数据库获取用户预约的课程数据
  const { data: bookedWorkshops, isLoading: bookingsLoading } = useQuery({
    queryKey: ["userBookedWorkshops", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        console.log('开始获取用户预约记录，用户ID:', user.id);
        const bookings = await getUserWorkshopBookings(user.id);
        console.log('获取到的预约记录:', bookings);
        return bookings.map(booking => ({
          id: booking.id,
          workshopId: booking.workshop_id,
          title: booking.workshops?.title || "未知工作坊",
          date: booking.workshops?.open_date || "",
          time: booking.workshops?.duration || "",
          location: booking.workshops?.location || "",
          status: booking.status === 'confirmed' ? '已确认' :
                 booking.status === 'pending_payment' ? '待支付' :
                 booking.status === 'paid' ? '已支付' :
                 booking.status === 'cancelled' ? '已取消' : '已完成',
          image: booking.workshops?.image || "https://nocode.meituan.com/photo/search?keyword=workshop&width=300&height=200",
          instructorName: booking.workshops?.instructors?.name || "",
          price: booking.total_amount || 0,
          participantName: booking.participant_name,
          participantPhone: booking.participant_phone,
          createdAt: booking.created_at
        }));
      } catch (error) {
        console.error('获取用户预约记录失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 关注的达人
  <section>
    <h2 className="text-xl font-light mb-4 flex items-center">
      <Users className="h-5 w-5 mr-2 text-[#d4a373]" />
      关注的达人
    </h2>

    {/* 关注的达人 - 添加网格布局 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {followingInstructors?.filter((instructor) => instructor && instructor.name).map((instructor) =>
        <Card key={`instructor-${instructor.id}`} className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate(`/instructor/${instructor.id}`)}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <img
                src={instructor.avatar || "https://nocode.meituan.com/photo/search?keyword=avatar,instructor&width=100&height=100"}
                alt={instructor.name}
                className="h-12 w-12 rounded-full object-cover mr-4"
              />
              <div className="flex-1">
                <h3 className="font-medium text-[#333] mb-1">{instructor.name}</h3>
                <p className="text-sm text-[#666] mb-1">
                  {instructor.expertise?.join(" · ") || "传统工艺"}
                </p>
                <p className="text-xs text-[#999]">
                  {instructor.followers || 0} 人关注
                </p>
              </div>
              <Button size="sm" className="ml-auto bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full">
                已关注
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    {/* 如果没有关注达人，显示提示 */}
    {followingInstructors?.length === 0 &&
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-[#e8e3db]">
        <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-[#999]" />
        </div>
        <h3 className="text-lg font-medium text-[#666] mb-2">您暂未关注任何达人</h3>
        <p className="text-sm text-[#999] mb-6">去达人页面发现您感兴趣的匠人吧！</p>
        <Button
          className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
          onClick={() => navigate('/instructors')}
        >
          立即前往达人页面 <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    }
  </section>

  // 模拟获取收藏的内容数据
  const { data: favorites } = useQuery({
    queryKey: ["userFavorites", user?.id],
    queryFn: async () => {
      return [
        {
          id: 1,
          type: "location",
          title: "时光书店",
          image: "https://nocode.meituan.com/photo/search?keyword=bookstore,cozy&width=300&height=200",
          likes: 128
        },
        {
          id: 2,
          type: "route",
          title: "胡同文化探索路线",
          image: "https://nocode.meituan.com/photo/search?keyword=hutong,beijing&width=300&height=200",
          likes: 89
        },
        {
          id: 3,
          type: "post",
          title: "周末在胡同里发现的美好",
          image: "https://nocode.meituan.com/photo/search?keyword=story,creative&width=300&height=200",
          likes: 203
        }
      ];
    },
    enabled: !!user
  });

  // 模拟获取用户发布的帖文数据
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const posts = await getUserPosts(user.id);
        return posts.map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          image: post.image,
          likes: post.likes || 0,
          comments: post.comments || 0,
          created_at: post.created_at,
          author: post.author,
          author_id: post.author_id
        }));
      } catch (error) {
        console.error("获取用户帖文失败:", error);
        return [];
      }
    },
    enabled: !!user
  });

  // 模拟获取互动数据
  const { data: interactions } = useQuery({
    queryKey: ["userInteractions", user?.id],
    queryFn: async () => {
      return [
        {
          id: 1,
          type: "like",
          content: "用户 李小红 赞了你的帖文《我的陶艺初体验》",
          date: "2023-12-17 14:30"
        },
        {
          id: 2,
          type: "comment",
          content: "用户 王大明 在你的帖文《胡同里的诗意时光》下评论：写得太好了！",
          date: "2023-12-16 09:15"
        },
        {
          id: 3,
          type: "follow",
          content: "用户 赵小丽 关注了你",
          date: "2023-12-15 18:42"
        }
      ];

    },
    enabled: !!user
  });

  // 模拟获取达人数据
  const { data: instructorData } = useQuery({
    queryKey: ["instructorData", user?.id],
    queryFn: async () => {
      return {
        workshops: [
          {
            id: 1,
            title: "手工陶艺体验课",
            date: "2023-12-15",
            price: 199,
            image: "https://nocode.meituan.com/photo/search?keyword=pottery,workshop&width=300&height=200"
          },
          {
            id: 2,
            title: "高级陶艺技法课",
            date: "2024-01-20",
            price: 399,
            image: "https://nocode.meituan.com/photo/search?keyword=pottery,advanced&width=300&height=200"
          }
        ],

        posts: [
          {
            id: 1,
            title: "我的陶艺之路",
            content: "从第一次接触陶土到现在，已经走过了20个年头...",
            image: "https://nocode.meituan.com/photo/search?keyword=pottery,journey&width=300&height=200",
            likes: 128,
            comments: 24,
            date: "2023-12-10"
          }
        ],

        interactions: [
          {
            id: 1,
            type: "like",
            content: "用户 张小明 赞了你的工作坊《手工陶艺体验课》",
            date: "2023-12-17 10:30"
          },
          {
            id: 2,
            type: "comment",
            content: "用户 李小红 在你的帖文《我的陶艺之路》下评论：受益匪浅！",
            date: "2023-12-16 15:20"
          },
          {
            id: 3,
            type: "booking",
            content: "用户 王大明 预约了你的工作坊《高级陶艺技法课》",
            date: "2023-12-15 11:45"
          }
        ]

      };
    },
    enabled: !!user
  });

  // 获取用户点赞的路线
  const { data: userLikedRoutes = [] } = useQuery({
    queryKey: ["user-liked-routes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedRoutes = await getUserLikedRoutes(user.id);
        return likedRoutes;
      } catch (error) {
        console.error('获取用户点赞路线失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取用户点赞的地点
  const { data: userLikedLocations = [] } = useQuery({
    queryKey: ["user-liked-locations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedLocations = await getUserLikedLocations(user.id);
        return likedLocations;
      } catch (error) {
        console.error('获取用户点赞地点失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取用户点赞的帖文
  const { data: userLikedPosts = [] } = useQuery({
    queryKey: ["user-liked-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedPosts = await getLikedPosts(user.id);
        return likedPosts;
      } catch (error) {
        console.error('获取用户点赞帖文失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取用户点赞的路线ID
  const { data: userLikedRouteIds = [] } = useQuery({
    queryKey: ["user-liked-route-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedRouteIds = await getUserLikedRouteIds(user.id);
        return likedRouteIds;
      } catch (error) {
        console.error('获取用户点赞路线ID失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取用户点赞的地点ID
  const { data: userLikedLocationIds = [] } = useQuery({
    queryKey: ["user-liked-location-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedLocationIds = await getUserLikedLocationIds(user.id);
        return likedLocationIds;
      } catch (error) {
        console.error('获取用户点赞地点ID失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 处理编辑资料跳转
  const handleEditProfile = () => {
    navigate('/settings');
  };

  // 处理跳转到设置页面
  const handleNavigateToSettings = () => {
    navigate('/settings');
  };

  // 处理头像上传（占位功能）
  const handleAvatarUpload = () => {
    alert("头像上传功能需要在设置页面使用图片上传组件实现");
  };

  // 处理个人简介编辑（占位功能）
  const handleBioEdit = () => {
    const newBio = prompt("请输入您的个人简介：", userProfile?.bio || "");
    if (newBio !== null) {
      alert("个人简介修改功能需要集成到设置页面的表单中");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-light text-[#666] mb-4">请先登录</h2>
            <Button
              className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
              onClick={() => navigate('/auth')}>

              立即登录
            </Button>
          </div>
        </div>
      </div>);

  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[#e8e3db] rounded w-1/4 mb-6"></div>
            <div className="h-32 bg-[#e8e3db] rounded mb-8"></div>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      
      <div className="container py-8">
        <motion.h1
          className="text-3xl font-light mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}>

          个人中心
        </motion.h1>
        
        {/* 用户信息卡片 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="relative group">
                <img
                  src={userProfile?.avatar}
                  alt={userProfile?.name}
                  className="h-20 w-20 rounded-full object-cover mr-6 cursor-pointer"
                  onClick={handleNavigateToSettings} />

                <div
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={handleNavigateToSettings}
                  title="去修改">

                  <Edit className="h-6 w-6 text-white" />
                  <span className="sr-only">去修改</span>
                </div>
              </div>

              <div className="flex-1">
                <h2
                  className="text-2xl font-medium text-[#333] mb-2 cursor-pointer hover:text-[#d4a373] transition-colors group relative"
                  onClick={handleNavigateToSettings}
                  title="去修改">

                  {userProfile?.name}
                  <Edit className="h-4 w-4 ml-2 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p
                  className="text-[#666] mt-1 cursor-pointer hover:text-[#d4a373] transition-colors"
                  onClick={handleNavigateToSettings}
                  title="去修改">

                  {userProfile?.bio}
                  <Edit className="h-3 w-3 ml-1 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <div className="flex items-center mt-3 text-sm text-[#999]">
                  <span>加入于 {userProfile?.joinDate}</span>
                  <span className="mx-2">•</span>
                  <span>关注 {userProfile?.followingCount} 人</span>
                  <span className="mx-2">•</span>
                  <span>{userProfile?.postCount} 篇帖文</span>
                  <span className="mx-2">•</span>
                  <span>{userProfile?.interactionCount} 次互动</span>
                </div>
              </div>

              <div className="ml-auto flex gap-2">
                <Button
                  className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
                  onClick={handleEditProfile}>

                  编辑资料
                </Button>
                <div />






              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 标签页切换 */}
        <div className="flex border-b border-[#e8e3db] mb-8">
          <button
            className={`px-6 py-3 text-sm font-medium ${
            activeTab === "explorer" ?
            "text-[#d4a373] border-b-2 border-[#d4a373]" :
            "text-[#666] hover:text-[#333]"}`
            }
            onClick={() => setActiveTab("explorer")}>

            本地探索者
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
            activeTab === "instructor" ?
            "text-[#d4a373] border-b-2 border-[#d4a373]" :
            "text-[#666] hover:text-[#333]"}`
            }
            onClick={() => setActiveTab("instructor")}>

            达人
          </button>
        </div>
        
        {/* 本地探索者内容 */}
        {activeTab === "explorer" &&
        <div className="space-y-8">
            {/* 关注的达人 */}
            <section>
              <h2 className="text-xl font-light mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#d4a373]" />
                关注的达人
              </h2>

              {/* 关注的达人 - 添加数据验证 */}
              {followingInstructors?.filter((instructor) => instructor && instructor.name).map((instructor) =>
                <Card key={`instructor-${instructor.id}`} className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/instructor/${instructor.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <img
                        src={instructor.avatar || "https://nocode.meituan.com/photo/search?keyword=avatar,instructor&width=100&height=100"}
                        alt={instructor.name}
                        className="h-12 w-12 rounded-full object-cover mr-4"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-[#333] mb-1">{instructor.name}</h3>
                        <p className="text-sm text-[#666] mb-1">
                          {instructor.expertise?.join(" · ") || "传统工艺"}
                        </p>
                        <p className="text-xs text-[#999]">
                          {instructor.followers || 0} 人关注
                        </p>
                      </div>
                      <Button size="sm" className="ml-auto bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full">
                        已关注
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 如果没有关注达人，显示提示 */}
              {followingInstructors?.length === 0 &&
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-[#e8e3db]">
                  <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-[#999]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#666] mb-2">您暂未关注任何达人</h3>
                  <p className="text-sm text-[#999] mb-6">去达人页面发现您感兴趣的匠人吧！</p>
                  <Button
                    className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
                    onClick={() => navigate('/instructors')}
                  >
                    立即前往达人页面 <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              }
            </section>
            
            {/* 预约的课程 */}
            <section>
              <h2 className="text-xl font-light mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#d4a373]" />
                预约的课程
              </h2>

              {/* 加载状态 */}
              {bookingsLoading ?
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) =>
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="flex">
                            <div className="h-20 w-20 bg-[#e8e3db] rounded-lg mr-4"></div>
                            <div className="flex-1">
                              <div className="h-6 bg-[#e8e3db] rounded w-3/4 mb-2"></div>
                              <div className="h-4 bg-[#e8e3db] rounded w-full mb-2"></div>
                              <div className="h-4 bg-[#e8e3db] rounded w-2/3 mb-3"></div>
                              <div className="flex justify-between">
                                <div className="h-6 bg-[#e8e3db] rounded w-16"></div>
                                <div className="h-6 bg-[#e8e3db] rounded w-16"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div> :

                /* 有预约课程 */
                bookedWorkshops?.length > 0 ?
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookedWorkshops?.map((workshop) =>
                    <Card key={workshop.id} className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => navigate(`/booking-success?bookingId=${workshop.id}&workshopId=${workshop.workshopId}&name=${encodeURIComponent(workshop.participantName)}&phone=${encodeURIComponent(workshop.participantPhone)}`)}>
                      <CardContent className="p-4">
                        <div className="flex">
                          <img
                            src={workshop.image}
                            alt={workshop.title}
                            className="h-20 w-20 rounded-lg object-cover mr-4"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-[#333] mb-1">{workshop.title}</h3>
                            <p className="text-sm text-[#666] mb-1">{workshop.date} {workshop.time}</p>
                            <p className="text-sm text-[#666] mb-1 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {workshop.location}
                            </p>
                            <p className="text-sm text-[#666] mb-2">
                              预约人: {workshop.participantName}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                workshop.status === "已确认" ? "bg-green-100 text-green-800" :
                                workshop.status === "待支付" ? "bg-yellow-100 text-yellow-800" :
                                workshop.status === "已支付" ? "bg-blue-100 text-blue-800" :
                                workshop.status === "已取消" ? "bg-red-100 text-red-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {workshop.status}
                              </span>
                              <span className="text-sm font-medium text-[#d4a373]">¥{workshop.price}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div> :

                /* 没有预约课程 */
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-[#e8e3db]">
                  <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-[#999]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#666] mb-2">您暂未预约任何课程</h3>
                  <p className="text-sm text-[#999] mb-6">去体验页面发现您感兴趣的课程吧！</p>
                  <Button
                    className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
                    onClick={() => navigate('/experience')}
                  >
                    立即前往体验页面 <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              }
            </section>
            
            {/* 收藏的内容 */}
            <section>
              <h2 className="text-xl font-light mb-4">点赞的内容</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 点赞的路线 - 添加数据验证 */}
                {userLikedRoutes?.filter((route) => route && route.name && route.description).map((route) =>
              <Card key={`route-${route.id}`} className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/discover/beijing?route=${route.id}`)}>
                    <CardContent className="p-4">
                      <img
                    src={route.image || "https://nocode.meituan.com/photo/search?keyword=route,creative&width=300&height=200"}
                    alt={route.name}
                    className="h-32 w-full rounded-lg object-cover mb-3" />

                      <h3 className="font-medium text-[#333] mb-2">{route.name}</h3>
                      <p className="text-sm text-[#666] mb-2 line-clamp-2">{route.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-[#999] capitalize">路线</span>
                          <span className="text-xs text-[#999]">•</span>
                          <span className="text-xs text-[#999]">{route.cities?.name || "北京"}</span>
                        </div>
                        <span className="text-xs text-[#999]">{route.points?.length || 0} 个点位</span>
                      </div>
                    </CardContent>
                  </Card>
              )}

                {/* 点赞的地点 - 添加数据验证 */}
                {userLikedLocations?.filter((location) => location && location.name && location.description).map((location) =>
              <Card key={`location-${location.id}`} className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/discover/beijing?location=${location.id}`)}>
                    <CardContent className="p-4">
                      <img
                    src={location.image || "https://nocode.meituan.com/photo/search?keyword=location,creative&width=300&height=200"}
                    alt={location.name}
                    className="h-32 w-full rounded-lg object-cover mb-3" />

                      <h3 className="font-medium text-[#333] mb-2">{location.name}</h3>
                      <p className="text-sm text-[#666] mb-2 line-clamp-2">{location.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-[#999] capitalize">地点</span>
                          <span className="text-xs text-[#999]">•</span>
                          <span className="text-xs text-[#999]">{location.cities?.name || "北京"}</span>
                          <span className="text-xs text-[#999]">•</span>
                          <span className="text-xs text-[#999]">{location.category || location.type}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-[#d4a373]">★</span>
                          <span className="text-xs text-[#999]">{location.rating || 4.5}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              )}

                {/* 点赞的帖文 - 添加数据验证 */}
                {userLikedPosts?.filter((post) => post && post.title).map((post) =>
              <Card key={`post-${post.id}`} className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/community?post=${post.id}`)}>
                    <CardContent className="p-4">
                      <img
                    src={post.image || "https://nocode.meituan.com/photo/search?keyword=story,creative&width=300&height=200"}
                    alt={post.title}
                    className="h-32 w-full rounded-lg object-cover mb-3" />

                      <h3 className="font-medium text-[#333] mb-2">{post.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#999] capitalize">帖文</span>
                        <span className="text-xs text-[#999]">{post.author || "匿名用户"}</span>
                      </div>
                    </CardContent>
                  </Card>
              )}

                {/* 加载状态显示 */}
                {(userLikedRoutes === undefined || userLikedLocations === undefined || userLikedPosts === undefined) &&
              <div className="col-span-full">
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4a373]"></div>
                      <span className="ml-3 text-[#666]">加载中...</span>
                    </div>
                  </div>
              }

                {/* 如果没有点赞内容，显示提示 */}
                {userLikedRoutes?.length === 0 && userLikedLocations?.length === 0 && userLikedPosts?.length === 0 &&
              <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-[#e8e3db]">
                    <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-8 w-8 text-[#999]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#666] mb-2">您暂未点赞任何内容</h3>
                    <p className="text-sm text-[#999] mb-6">去发现页面和社区点赞您喜欢的内容吧！</p>
                    <div className="flex justify-center gap-4">
                      <Button
                    className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
                    onClick={() => navigate('/discover?city=1')}>

                        去发现页面
                      </Button>
                      <Button
                    variant="outline"
                    className="border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373]/10"
                    onClick={() => navigate('/community')}>

                        去社区
                      </Button>
                    </div>
                    </div>
              }
              </div>
            </section>
            
            {/* 我的帖文 */}
            <section>
              <h2 className="text-xl font-light mb-4">我的帖文</h2>
              {postsLoading ?
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) =>
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="h-6 bg-[#e8e3db] rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-[#e8e3db] rounded w-full mb-3"></div>
                          <div className="h-4 bg-[#e8e3db] rounded w-2/3 mb-4"></div>
                          <div className="flex justify-between">
                            <div className="h-3 bg-[#e8e3db] rounded w-1/4"></div>
                            <div className="flex space-x-4">
                              <div className="h-3 bg-[#e8e3db] rounded w-8"></div>
                              <div className="h-3 bg-[#e8e3db] rounded w-8"></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div> :
                userPosts?.length > 0 ?
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPosts?.map((post) =>
                    <Card key={post.id} className="group hover:shadow-md transition-all cursor-pointer relative"
                      onClick={() => navigate(`/community?post=${post.id}`)}>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-[#333] mb-2">{post.title}</h3>
                        <p className="text-sm text-[#666] mb-3 line-clamp-2">{post.content}</p>
                        {post.image &&
                          <img
                            src={post.image}
                            alt={post.title}
                            className="h-48 w-full rounded-lg object-cover mb-3"
                          />
                        }
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#999]">{post.date}</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-[#999]">
                              <Heart className="h-4 w-4 mr-1" />
                              <span className="text-xs">{post.likes}</span>
                            </div>
                            <div className="flex items-center text-[#999]">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              <span className="text-xs">{post.comments}</span>
                            </div>
                            <button className="text-[#999] hover:text-[#d4a373]"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 分享功能
                              }}>
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {/* 悬停时显示的跳转按钮 */}
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button className="bg-white text-[#d4a373] hover:bg-[#d4a373] hover:text-white">
                            查看完整帖文 <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div> :

                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-[#e8e3db]">
                  <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-[#999]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#666] mb-2">您暂未发布任何帖文</h3>
                  <p className="text-sm text-[#999] mb-6">快去社区分享您的精彩故事吧！</p>
                  <Button
                    className="bg-[#d4a373] hover:bg-[#c99a67] text-white"
                    onClick={() => navigate('/community')}>
                    立即前往社区 <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              }
            </section>
            
            {/* 收到的互动 */}
            <section>
              <h2 className="text-xl font-light mb-4">收到的互动</h2>
              <Card>
                <CardContent className="p-0">
                  {interactions?.map((interaction) =>
                <div key={interaction.id} className="p-4 border-b border-[#e8e3db] last:border-0">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-full mr-3 ${
                    interaction.type === "like" ? "bg-red-100 text-red-500" :
                    interaction.type === "comment" ? "bg-blue-100 text-blue-500" :
                    "bg-green-100 text-green-500"}`
                    }>
                          {interaction.type === "like" && <Heart className="h-4 w-4" />}
                          {interaction.type === "comment" && <MessageCircle className="h-4 w-4" />}
                          {interaction.type === "follow" && <Users className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#333]">{interaction.content}</p>
                          <p className="text-xs text-[#999] mt-1">{interaction.date}</p>
                        </div>
                      </div>
                    </div>
                )}
                </CardContent>
              </Card>
            </section>
          </div>
        }
        
        {/* 达人内容 */}
        {activeTab === "instructor" &&
        <div className="space-y-8">
            {/* 发布的课程 */}
            <section>
              <h2 className="text-xl font-light mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#d4a373]" />
                发布的课程
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructorData?.workshops?.map((workshop) =>
              <Card key={workshop.id}>
                    <CardContent className="p-4">
                      <div className="flex">
                        <img
                      src={workshop.image}
                      alt={workshop.title}
                      className="h-20 w-20 rounded-lg object-cover mr-4" />

                        <div className="flex-1">
                          <h3 className="font-medium text-[#333]">{workshop.title}</h3>
                          <p className="text-sm text-[#666] mt-1">{workshop.date}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[#d4a373] font-medium">¥{workshop.price}</span>
                            <Button size="sm" variant="outline" className="rounded-full text-xs">
                              查看详情
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              )}
              </div>
            </section>
            
            {/* 我的帖文 */}
            <section>
              <h2 className="text-xl font-light mb-4">我的帖文</h2>
              <div className="space-y-4">
                {instructorData?.posts?.map((post) =>
              <Card key={post.id}>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-[#333] mb-2">{post.title}</h3>
                      <p className="text-sm text-[#666] mb-3">{post.content}</p>
                      {post.image &&
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-48 w-full rounded-lg object-cover mb-3" />

                  }
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#999]">{post.date}</span>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-[#999]">
                            <Heart className="h-4 w-4 mr-1" />
                            <span className="text-xs">{post.likes}</span>
                          </div>
                          <div className="flex items-center text-[#999]">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">{post.comments}</span>
                          </div>
                          <button className="text-[#999] hover:text-[#d4a373]">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              )}
              </div>
            </section>
            
            {/* 收到的互动 */}
            <section>
              <h2 className="text-xl font-light mb-4">收到的互动</h2>
              <Card>
                <CardContent className="p-0">
                  {instructorData?.interactions?.map((interaction) =>
                <div key={interaction.id} className="p-4 border-b border-[#e8e3db] last:border-0">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-full mr-3 ${
                    interaction.type === "like" ? "bg-red-100 text-red-500" :
                    interaction.type === "comment" ? "bg-blue-100 text-blue-500" :
                    "bg-green-100 text-green-500"}`
                    }>
                          {interaction.type === "like" && <Heart className="h-4 w-4" />}
                          {interaction.type === "comment" && <MessageCircle className="h-4 w-4" />}
                          {interaction.type === "booking" && <Calendar className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#333]">{interaction.content}</p>
                          <p className="text-xs text-[#999] mt-1">{interaction.date}</p>
                        </div>
                      </div>
                    </div>
                )}
                </CardContent>
              </Card>
            </section>
            
            {/* 数据看板 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#d4a373]" />
                  数据看板
                </h2>
                <Button
                variant="outline"
                className="rounded-full text-sm"
                onClick={() => navigate('/user-center')}>

                  查看完整版
                </Button>
              </div>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <DashboardPreview />
                </CardContent>
              </Card>
            </section>
          </div>
        }
      </div>
    </div>);

};

export default UserCenter;
