import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Calendar, MapPin, Users, BarChart3, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

const UserCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("explorer");

  // 模拟获取用户数据
  const { data: user } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      return {
        id: 1,
        name: "张小明",
        avatar: "https://nocode.meituan.com/photo/search?keyword=avatar&width=100&height=100",
        bio: "热爱探索城市中的创意角落，喜欢手工艺和传统文化",
        joinDate: "2023-01-15",
        followingCount: 24,
        postCount: 42,
        interactionCount: 128
      };
    }
  });

  // 模拟获取关注的达人数据
  const { data: followingInstructors } = useQuery({
    queryKey: ["followingInstructors"],
    queryFn: async () => {
      return [
      {
        id: 1,
        name: "陶艺大师张老师",
        avatar: "https://nocode.meituan.com/photo/search?keyword=potter,master&width=100&height=100",
        expertise: ["陶艺", "传统工艺"],
        followers: 1242
      },
      {
        id: 2,
        name: "水彩画家王老师",
        avatar: "https://nocode.meituan.com/photo/search?keyword=artist,painter&width=100&height=100",
        expertise: ["水彩画", "素描"],
        followers: 892
      }];

    }
  });

  // 模拟获取预约的课程数据
  const { data: bookedWorkshops } = useQuery({
    queryKey: ["bookedWorkshops"],
    queryFn: async () => {
      return [
      {
        id: 1,
        title: "手工陶艺体验课",
        date: "2023-12-15",
        time: "14:00-17:00",
        location: "朝阳区798艺术区",
        status: "已确认",
        image: "https://nocode.meituan.com/photo/search?keyword=pottery,workshop&width=300&height=200"
      },
      {
        id: 2,
        title: "水彩画入门课程",
        date: "2023-12-20",
        time: "10:00-12:00",
        location: "海淀区五道口",
        status: "待确认",
        image: "https://nocode.meituan.com/photo/search?keyword=watercolor,painting&width=300&height=200"
      }];

    }
  });

  // 模拟获取收藏的内容数据
  const { data: favorites } = useQuery({
    queryKey: ["userFavorites"],
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
      }];

    }
  });

  // 模拟获取用户发布的帖文数据
  const { data: userPosts } = useQuery({
    queryKey: ["userPosts"],
    queryFn: async () => {
      return [
      {
        id: 1,
        title: "我的陶艺初体验",
        content: "今天参加了张老师的陶艺工作坊，第一次亲手制作陶器，感觉非常棒！",
        image: "https://nocode.meituan.com/photo/search?keyword=pottery,workshop&width=300&height=200",
        likes: 42,
        comments: 8,
        date: "2023-12-16"
      },
      {
        id: 2,
        title: "胡同里的诗意时光",
        content: "在这个快节奏的城市中，总有一些角落能让人慢下来，感受生活的美好",
        image: "https://nocode.meituan.com/photo/search?keyword=city,poetic&width=300&height=200",
        likes: 56,
        comments: 12,
        date: "2023-12-10"
      }];

    }
  });

  // 模拟获取互动数据
  const { data: interactions } = useQuery({
    queryKey: ["userInteractions"],
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
      }];

    }
  });

  // 模拟获取达人数据
  const { data: instructorData } = useQuery({
    queryKey: ["instructorData"],
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
        }],

        posts: [
        {
          id: 1,
          title: "我的陶艺之路",
          content: "从第一次接触陶土到现在，已经走过了20个年头...",
          image: "https://nocode.meituan.com/photo/search?keyword=pottery,journey&width=300&height=200",
          likes: 128,
          comments: 24,
          date: "2023-12-10"
        }],

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
        }]

      };
    }
  });

  // 模拟获取数据看板数据
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: async () => {
      return {
        stats: [
        { title: "总浏览量", value: "1,248", icon: <BarChart3 className="h-5 w-5" />, change: "+12%" },
        { title: "总转化率", value: "8.2%", icon: <TrendingUp className="h-5 w-5" />, change: "+2.1%" },
        { title: "总收入", value: "¥24,560", icon: <Wallet className="h-5 w-5" />, change: "+18%" }],

        chartData: [
        { name: "周一", views: 120, bookings: 8 },
        { name: "周二", views: 190, bookings: 12 },
        { name: "周三", views: 150, bookings: 10 },
        { name: "周四", views: 220, bookings: 15 },
        { name: "周五", views: 280, bookings: 22 },
        { name: "周六", views: 320, bookings: 28 },
        { name: "周日", views: 260, bookings: 20 }]

      };
    }
  });

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
              <img
                src={user?.avatar}
                alt={user?.name}
                className="h-20 w-20 rounded-full object-cover mr-6" />

              <div>
                <h2 className="text-2xl font-medium text-[#333]">{user?.name}</h2>
                <p className="text-[#666] mt-1">{user?.bio}</p>
                <div className="flex items-center mt-3 text-sm text-[#999]">
                  <span>加入于 {user?.joinDate}</span>
                  <span className="mx-2">•</span>
                  <span>关注 {user?.followingCount} 人</span>
                  <span className="mx-2">•</span>
                  <span>{user?.postCount} 篇帖文</span>
                  <span className="mx-2">•</span>
                  <span>{user?.interactionCount} 次互动</span>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <Button className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full">
                  编辑资料
                </Button>
                <Button
                  variant="outline"
                  className="border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373]/10 rounded-full"
                  onClick={() => navigate('/user-center-true')}
                >
                  真实版（搭建中）
                </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followingInstructors?.map((instructor) =>
              <Card key={instructor.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <img
                      src={instructor.avatar}
                      alt={instructor.name}
                      className="h-12 w-12 rounded-full object-cover mr-4" />

                        <div>
                          <h3 className="font-medium text-[#333]">{instructor.name}</h3>
                          <p className="text-sm text-[#666]">
                            {instructor.expertise.join(" · ")}
                          </p>
                          <p className="text-xs text-[#999] mt-1">
                            {instructor.followers} 人关注
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
            </section>
            
            {/* 预约的课程 */}
            <section>
              <h2 className="text-xl font-light mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#d4a373]" />
                预约的课程
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookedWorkshops?.map((workshop) =>
              <Card key={workshop.id}>
                    <CardContent className="p-4">
                      <div className="flex">
                        <img
                      src={workshop.image}
                      alt={workshop.title}
                      className="h-20 w-20 rounded-lg object-cover mr-4" />

                        <div className="flex-1">
                          <h3 className="font-medium text-[#333]">{workshop.title}</h3>
                          <p className="text-sm text-[#666] mt-1">{workshop.date} {workshop.time}</p>
                          <p className="text-sm text-[#666] mt-1 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {workshop.location}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                        workshop.status === "已确认" ?
                        "bg-green-100 text-green-800" :
                        "bg-yellow-100 text-yellow-800"}`
                        }>
                              {workshop.status}
                            </span>
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
            
            {/* 收藏的内容 */}
            <section>
              <h2 className="text-xl font-light mb-4">收藏的内容</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites?.map((item) =>
              <Card key={item.id}>
                    <CardContent className="p-4">
                      <img
                    src={item.image}
                    alt={item.title}
                    className="h-32 w-full rounded-lg object-cover mb-3" />

                      <h3 className="font-medium text-[#333] mb-2">{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#999] capitalize">
                          {item.type === "location" && "地点"}
                          {item.type === "route" && "路线"}
                          {item.type === "post" && "帖文"}
                        </span>
                        <div className="flex items-center text-[#999]">
                          <Heart className="h-4 w-4 mr-1" />
                          <span className="text-xs">{item.likes}</span>
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
                {userPosts?.map((post) =>
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
              <h2 className="text-xl font-light mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#d4a373]" />
                数据看板
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {dashboardData?.stats?.map((stat, index) =>
              <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#666]">{stat.title}</p>
                          <h3 className="text-2xl font-medium text-[#333] mt-1">{stat.value}</h3>
                        </div>
                        <div className="p-3 bg-[#d4a373]/10 rounded-full text-[#d4a373]">
                          {stat.icon}
                        </div>
                      </div>
                      <p className="text-xs text-green-600 mt-3 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.change} 与上周相比
                      </p>
                    </CardContent>
                  </Card>
              )}
              </div>
              
              {/* 图表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">本周数据趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-[#999]">数据看板需付费使用，详情请咨询：NoCodewithICCI.163.com</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        }
      </div>
    </div>);

};

export default UserCenter;
