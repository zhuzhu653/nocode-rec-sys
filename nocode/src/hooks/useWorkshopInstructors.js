import { useQuery } from "@tanstack/react-query";

// 获取所有达人
export const useInstructors = () => {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return [
        {
          id: 1,
          name: "陶艺大师张老师",
          avatar: "https://nocode.meituan.com/photo/search?keyword=potter,master&width=100&height=100",
          bio: "从事陶艺创作20年，曾在日本学习传统陶艺技法，作品多次获得国内外奖项。",
          expertise: ["陶艺", "传统工艺"],
          socialLinks: {
            wechat: "zhang_potter",
            weibo: "陶艺大师张老师",
          },
        },
        {
          id: 2,
          name: "水彩画家王老师",
          avatar: "https://nocode.meituan.com/photo/search?keyword=artist,painter&width=100&height=100",
          bio: "专业水彩画家，作品风格清新自然，擅长风景和静物画。",
          expertise: ["水彩画", "素描"],
          socialLinks: {
            wechat: "wang_artist",
            weibo: "水彩画家王老师",
          },
        },
        {
          id: 3,
          name: "木工师傅李师傅",
          avatar: "https://nocode.meituan.com/photo/search?keyword=carpenter,woodworker&width=100&height=100",
          bio: "传统木工技艺传承人，擅长制作实用家具和装饰品。",
          expertise: ["木工", "家具制作"],
          socialLinks: {
            wechat: "li_carpenter",
            weibo: "木工师傅李师傅",
          },
        },
      ];
    },
  });
};

// 获取达人详情
export const useInstructorDetail = (id) => {
  return useQuery({
    queryKey: ["instructorDetail", id],
    queryFn: async () => {
      // 实际应用中这里会调用API
      // 模拟API调用
      return {
        id: 1,
        name: "陶艺大师张老师",
        avatar: "https://nocode.meituan.com/photo/search?keyword=potter,master&width=100&height=100",
        bio: "从事陶艺创作20年，曾在日本学习传统陶艺技法，作品多次获得国内外奖项。",
        expertise: ["陶艺", "传统工艺"],
        socialLinks: {
          wechat: "zhang_potter",
          weibo: "陶艺大师张老师",
        },
        workshops: [
          {
            id: 1,
            title: "手工陶艺体验课",
            price: 199,
            date: "2023-12-15",
          },
          {
            id: 7,
            title: "高级陶艺技法课",
            price: 399,
            date: "2024-01-20",
          },
        ],
      };
    },
  });
};
