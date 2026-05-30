import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ContentCard from "./ContentCard";

const ContentFeed = () => {
  // 模拟数据获取
  const { data: contentItems, isLoading } = useQuery({
    queryKey: ["contentFeed"],
    queryFn: async () => {
      // 模拟API调用
      return [
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
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <motion.div 
              key={i} 
              className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            ></motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentItems?.map((item, index) => (
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
    </div>
  );
};

export default ContentFeed;
