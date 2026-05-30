import { Heart, MessageCircle, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const ContentCard = ({ type, data }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (type === "workshop") {
      // 跳转到体验页面
      navigate("/experience");
    } else {
      // 跳转到社区页面
      navigate("/community");
    }
  };

  const renderCardByType = () => {
    switch (type) {
      case "workshop":
        return (
          <motion.div 
            className="overflow-hidden rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] text-[#333] shadow-sm cursor-pointer relative"
            whileHover={{ y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <img
                src={`https://nocode.meituan.com/photo/search?keyword=workshop,creative&width=400&height=200`}
                alt={data.title}
                className="h-48 w-full object-cover"
              />
              <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                ¥{data.price}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-medium">{data.title}</h3>
              <p className="mt-1 text-sm text-[#666]">{data.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src={`https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32`}
                    alt={data.creator}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span className="ml-2 text-sm text-[#666]">{data.creator}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="flex items-center text-[#999] hover:text-[#d4a373] transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="ml-1 text-xs">{data.likes}</span>
                  </button>
                </div>
              </div>
            </div>
            {/* 悬停时显示的跳转按钮 */}
            <motion.div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              whileHover={{ opacity: 1 }}
            >
              <button 
                className="bg-[#d4a373] text-white px-6 py-2 rounded-full font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                跳转
              </button>
            </motion.div>
          </motion.div>
        );
      case "story":
        return (
          <motion.div 
            className="overflow-hidden rounded-2xl border border-[#e8e3db] bg-[#f9f7f3] text-[#333] shadow-sm cursor-pointer relative"
            whileHover={{ y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4">
              <div className="flex items-center">
                <img
                  src={`https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32`}
                  alt={data.author}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="ml-2">
                  <p className="text-sm font-medium">{data.author}</p>
                  <p className="text-xs text-[#999]">{data.date}</p>
                </div>
              </div>
              <h3 className="mt-2 font-medium">{data.title}</h3>
              <p className="mt-1 text-sm text-[#666]">{data.content}</p>
              {data.image && (
                <img
                  src={`https://nocode.meituan.com/photo/search?keyword=story,creative&width=400&height=200`}
                  alt={data.title}
                  className="mt-2 h-48 w-full rounded-lg object-cover"
                />
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center text-[#999] hover:text-[#d4a373] transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="ml-1 text-xs">{data.likes}</span>
                  </button>
                  <button className="flex items-center text-[#999] hover:text-[#d4a373] transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="ml-1 text-xs">{data.comments}</span>
                  </button>
                </div>
                <button className="text-[#999] hover:text-[#d4a373] transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* 悬停时显示的跳转按钮 */}
            <motion.div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              whileHover={{ opacity: 1 }}
            >
              <button 
                className="bg-[#d4a373] text-white px-6 py-2 rounded-full font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                跳转
              </button>
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return renderCardByType();
};

export default ContentCard;
