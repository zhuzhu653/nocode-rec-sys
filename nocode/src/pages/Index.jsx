import { motion } from 'framer-motion';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import QuickAccess from '../components/QuickAccess';
import ContentFeed from '../components/ContentFeed';
import ContentCard from '../components/ContentCard';
import AISearchBar from '../components/AISearchBar';
import { Calendar, ChevronDown, MapPin, Users, Tag } from 'lucide-react';
import { useState } from 'react';
const Index = () => {
  const navigate = useNavigate();
  
  // 今日策展数据
  const todayFeatured = {
    video: {
      title: "陶艺家手部特写",
      description: "感受泥土与艺术的完美融合",
      videoUrl: "https://nocode.meituan.com/photo/search?keyword=pottery,artisan&width=600&height=400",
    },
    workshop: {
      title: "金缮修复工作坊",
      description: "残缺之美，用金粉修复时光的痕迹",
      price: 299,
      image: "https://nocode.meituan.com/photo/search?keyword=kintsugi,ceramic&width=400&height=300",
    },
  };

  // 智能推荐数据
  const recommendations = [
    {
      type: "venue",
      title: "时间在这里，被装订成册",
      image: "https://nocode.meituan.com/photo/search?keyword=bookstore,cozy&width=300&height=400",
    },
    {
      type: "route",
      title: "胡同里的诗意时光",
      image: "https://nocode.meituan.com/photo/search?keyword=hutong,beijing&width=300&height=400",
    },
    {
      type: "artist",
      title: "用画笔记录城市温度",
      image: "https://nocode.meituan.com/photo/search?keyword=artist,painting&width=300&height=400",
    },
    {
      type: "venue",
      title: "城市中的静谧花园",
      image: "https://nocode.meituan.com/photo/search?keyword=garden,peaceful&width=300&height=400",
    },
    {
      type: "route",
      title: "老北京文化探索之旅",
      image: "https://nocode.meituan.com/photo/search?keyword=beijing,culture&width=300&height=400",
    },
    {
      type: "artist",
      title: "传统手工艺的现代诠释",
      image: "https://nocode.meituan.com/photo/search?keyword=craft,traditional&width=300&height=400",
    },
  ];

  // 动态活动数据
  const allActivities = [
    {
      id: 1,
      type: "workshop",
      title: "手工陶艺体验课",
      description: "在专业陶艺师的指导下，亲手制作属于自己的陶器作品",
      price: 199,
      creator: "陶艺大师张老师",
      likes: 128,
    },
    {
      id: 2,
      type: "story",
      title: "周末在胡同里发现的美好",
      content: "今天偶然走进了一家隐藏在胡同深处的小店，店主是一位退休的老教师，店里摆满了各种手工艺品...",
      author: "文艺青年小李",
      date: "2天前",
      image: true,
      likes: 89,
      comments: 12,
    },
    {
      id: 3,
      type: "workshop",
      title: "水彩画入门课程",
      description: "零基础学习水彩画，感受色彩的魅力",
      price: 299,
      creator: "水彩画家王老师",
      likes: 156,
    },
    {
      id: 4,
      type: "story",
      title: "城市探索日记",
      content: "用脚步丈量城市的每一个角落，发现那些被遗忘的美好时光",
      author: "城市探索者",
      date: "1天前",
      image: true,
      likes: 203,
      comments: 28,
    },
    {
      id: 5,
      type: "workshop",
      title: "木工制作体验",
      description: "学习传统木工技艺，制作实用小物件",
      price: 249,
      creator: "木工师傅李师傅",
      likes: 98,
    },
    {
      id: 6,
      type: "story",
      title: "寻找城市中的诗意角落",
      content: "在这个快节奏的城市中，总有一些角落能让人慢下来，感受生活的美好",
      author: "城市诗人",
      date: "3天前",
      image: true,
      likes: 156,
      comments: 24,
    },
    {
      id: 7,
      type: "workshop",
      title: "花艺设计工作坊",
      description: "学习花艺设计，用鲜花装点生活",
      price: 189,
      creator: "花艺师小美",
      likes: 134,
    },
    {
      id: 8,
      type: "story",
      title: "老北京的记忆",
      content: "那些即将消失的老北京记忆，值得我们用心去记录和传承",
      author: "老北京文化爱好者",
      date: "5天前",
      image: true,
      likes: 267,
      comments: 42,
    },
  ];

  // 状态管理
  const [showAllActivities, setShowAllActivities] = useState(false);

  // 显示的活动数量
  const visibleActivities = showAllActivities ? allActivities : allActivities.slice(0, 6);

  // 处理金缮修复工作坊的预约按钮点击
  const handleBookWorkshop = () => {
    // 跳转到体验页面
    navigate("/experience");
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />

      {/* AI 智能搜索入口 */}
      <section className="container pt-6 pb-2 md:pt-8 md:pb-4">
        <AISearchBar
          onResultClick={(item) => navigate(`/discover?search=${encodeURIComponent(item.name)}`)}
        />
      </section>
      
      {/* Hero Banner - 今日策展 */}
      <section className="container py-6 md:py-8">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-auto md:h-[400px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 左侧主卡 - 视频展示 */}
          <div className="lg:col-span-2 relative rounded-xl md:rounded-2xl overflow-hidden shadow-lg aspect-video md:aspect-auto group cursor-pointer"
            onClick={() => navigate("/discover")}
          >
            <img 
              src={todayFeatured.video.videoUrl} 
              alt={todayFeatured.video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-4 md:p-6 lg:p-8 group-hover:bg-black/40 transition-all duration-300">
              <h2 className="text-lg md:text-xl lg:text-2xl font-light text-white mb-1 md:mb-2">今日策展</h2>
              <h3 className="text-xl md:text-2xl lg:text-3xl font-medium text-white mb-2 md:mb-4">陶艺家手工特写</h3>
              <p className="text-white/80 max-w-md text-sm md:text-base">{todayFeatured.video.description}</p>

              {/* 悬浮时显示的跳转按钮 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-[#d4a373]/80 rounded-full p-3 md:p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧副卡 - 工作坊 */}
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-lg aspect-video md:aspect-auto">
            <img 
              src={todayFeatured.workshop.image} 
              alt={todayFeatured.workshop.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3 md:p-4 lg:p-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 md:p-4">
                <span className="text-xs text-white/80">今日主推</span>
                <h3 className="text-base md:text-lg lg:text-xl font-medium text-white mt-1">{todayFeatured.workshop.title}</h3>
                <p className="text-white/80 text-xs md:text-sm mt-1 md:mt-2">{todayFeatured.workshop.description}</p>
                <div className="flex justify-between items-center mt-3 md:mt-4">
                  <span className="text-white font-medium text-sm md:text-base">¥{todayFeatured.workshop.price}</span>
                  <button 
                    className="bg-[#d4a373] hover:bg-[#c99a67] text-white px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm transition-colors"
                    onClick={handleBookWorkshop}
                  >
                    立即探索
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 智能推荐区 - 可左右滑动 */}
      <section className="container py-6 md:py-8">
        <motion.h2 
          className="text-xl md:text-2xl font-light mb-4 md:mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          为你流淌的灵感
        </motion.h2>
        
        <div className="relative">
          <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex space-x-4 md:space-x-6" style={{ width: "max-content" }}>
              {recommendations.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex-shrink-0 w-48 h-64 md:w-56 md:h-72 lg:w-64 lg:h-80 rounded-xl md:rounded-2xl overflow-hidden shadow-md relative group cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    if (item.type === "artist") {
                      // 跳转到达人页面
                      navigate("/instructors");
                    } else {
                      // 跳转到发现页面
                      navigate("/discover");
                    }
                  }}
                >
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 md:p-6">
                    <p className="text-white text-sm md:text-base lg:text-lg font-light">{item.title}</p>
                  </div>
                  <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                    {item.type === "venue" && "展馆"}
                    {item.type === "route" && "路线"}
                    {item.type === "artist" && "匠人"}
                  </div>
                  {/* 悬停时显示的箭头图标 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-[#d4a373]/80 rounded-full p-2 md:p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* 滑动指示器 */}
          <div className="flex justify-center mt-4 space-x-2">
            {recommendations.map((_, index) => (
              <div 
                key={index} 
                className="w-2 h-2 rounded-full bg-[#e8e3db] transition-colors"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 活动banner - 灵感流专属优惠 */}
      <section className="container py-6 md:py-8">
        <motion.div
          className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-xl group cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onClick={() => navigate("/marketplace")}
        >
          <img
            src="https://db0pq2tvjkuyx5.database.nocode.cn/storage/v1/object/public/wxpay//7c3017ef8eb8119a7c8b8cafaccffef5.jpg"
            alt="数字文创产品专属优惠"
            className="w-full h-48 md:h-64 object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4a373]/80 to-[#8b5a2b]/80 flex items-center justify-center p-6 md:p-8 group-hover:from-[#d4a373]/90 group-hover:to-[#8b5a2b]/90 transition-all duration-500">
            <div className="text-center text-white">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-light mb-2">数字文创产品专属优惠</h3>
              <p className="text-sm md:text-base lg:text-lg mb-4 md:mb-6 opacity-90">发现更多创意商品，限时特惠中</p>

              {/* 点击显示的跳转按钮 */}
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                whileHover={{ scale: 1.05 }}
              >
                <button className="bg-white text-[#8b5a2b] px-6 py-2 md:px-8 md:py-3 rounded-full font-medium text-sm md:text-base transition-colors hover:bg-[#f9f7f3] hover:text-[#6d4519]">
                  前往集市
                </button>
              </motion.div>

              {/* 非悬浮时显示的小提示 */}
              <div className="opacity-70 group-hover:opacity-0 transition-opacity duration-300 text-xs md:text-sm mt-2">
                点击查看详情
              </div>
            </div>
          </div>

          {/* 角标 - 限时优惠 */}
          <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            限时
          </div>
        </motion.div>
      </section>

      {/* 快速访问区 */}
      <section className="container py-6 md:py-8">
        <motion.h2 
          className="text-xl md:text-2xl font-light mb-4 md:mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          快速访问
        </motion.h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <motion.button
            className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] p-4 md:p-6 text-[#333] shadow-sm transition-all hover:bg-[#e8e3db] hover:text-[#d4a373] hover:shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/discover")}
          >
            <div className="mb-2 md:mb-3 rounded-full bg-[#d4a373]/10 p-2 md:p-3 text-[#d4a373]">
              <MapPin className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-xs md:text-sm font-light">推荐路线</span>
          </motion.button>
          
          <motion.button
            className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] p-4 md:p-6 text-[#333] shadow-sm transition-all hover:bg-[#e8e3db] hover:text-[#d4a373] hover:shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/experience")}
          >
            <div className="mb-2 md:mb-3 rounded-full bg-[#d4a373]/10 p-2 md:p-3 text-[#d4a373]">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-xs md:text-sm font-light">最新活动</span>
          </motion.button>
          
          <motion.button
            className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] p-4 md:p-6 text-[#333] shadow-sm transition-all hover:bg-[#e8e3db] hover:text-[#d4a373] hover:shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/instructors")}
          >
            <div className="mb-2 md:mb-3 rounded-full bg-[#d4a373]/10 p-2 md:p-3 text-[#d4a373]">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-xs md:text-sm font-light">热门达人</span>
          </motion.button>
          
          <motion.button
            className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] p-4 md:p-6 text-[#333] shadow-sm transition-all hover:bg-[#e8e3db] hover:text-[#d4a373] hover:shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/marketplace")}
          >
            <div className="mb-2 md:mb-3 rounded-full bg-[#d4a373]/10 p-2 md:p-3 text-[#d4a373]">
              <Tag className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-xs md:text-sm font-light">限时优惠</span>
          </motion.button>
        </div>
      </section>

      {/* 动态活动列表 - 有限展示 */}
      <section className="container py-6 md:py-8">
        <motion.h2 
          className="text-xl md:text-2xl font-light mb-4 md:mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          正在发生
        </motion.h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {visibleActivities.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ContentCard type={item.type} data={item} />
            </motion.div>
          ))}
        </div>
        
        {!showAllActivities && allActivities.length > 6 && (
          <div className="flex justify-center mt-6 md:mt-8">
            <button 
              onClick={() => setShowAllActivities(true)}
              className="flex items-center gap-2 bg-[#d4a373] hover:bg-[#c99a67] text-white px-4 py-2 md:px-6 md:py-3 rounded-full transition-colors text-sm md:text-base"
            >
              更多内容
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </div>
        )}
      </section>

      {/* 底部信息区 */}
      <footer className="bg-[#f0ede8] py-8 md:py-12 mt-12 md:mt-16">
        <div className="container">
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-light text-[#333] mb-2">循踪觅意 Tracing & Meaning</h3>
            <p className="text-[#666] mb-4 md:mb-6 text-sm md:text-base">发现城市未定义的美</p>
            
            <div className="flex justify-center space-x-4 md:space-x-6 mb-6 md:mb-8">
              <a href="#" className="text-[#666] hover:text-[#d4a373] transition-colors">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-2.78-4.919-4.919-4.919-6.98.073-4.948.073-4.948zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.204 0 3.584-.014 4.849-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="text-[#666] hover:text-[#d4a373] transition-colors">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-[#666] hover:text-[#d4a373] transition-colors">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.441 16.892c-2.102.144-6.784.144-8.883 0-2.276-.156-2.541-1.27-2.558-4.892.017-3.629.285-4.736 2.558-4.892 2.099-.144 6.782-.144 8.883 0 2.277.156 2.541 1.27 2.559 4.892-.018 3.629-.285 4.736-2.559 4.892zm-6.441-7.234l4.917 2.338-4.917 2.346v-4.684z"/>
                </svg>
              </a>
            </div>
            
            <div className="text-xs md:text-sm text-[#999] space-x-3 md:space-x-4">
              <a href="#" className="hover:text-[#d4a373] transition-colors">版权声明</a>
              <a href="#" className="hover:text-[#d4a373] transition-colors">隐私政策</a>
              <a href="#" className="hover:text-[#d4a373] transition-colors">合作洽谈</a>
              <a href="#" className="hover:text-[#d4a373] transition-colors">开发者日记</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
