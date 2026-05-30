import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Star, Clock, Phone, Heart, Share2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const LocationDetail = ({ location, onBack, onLocationLike, isLiked, user, onLoginRequired }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  // 模拟图片数据
  const images = [
    `https://nocode.meituan.com/photo/search?keyword=${location.type},creative&width=600&height=400`,
    `https://nocode.meituan.com/photo/search?keyword=${location.type},interior&width=600&height=400`,
    `https://nocode.meituan.com/photo/search?keyword=${location.type},detail&width=600&height=400`,
  ];

  const handleLike = () => {
    if (!user) {
      onLoginRequired();
      return;
    }
    onLocationLike(location.id);
  };

  const handleShare = () => {
    // 实际应用中这里会调用分享API
    console.log(`分享 ${location.name}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 - 返回按钮和操作按钮 */}
      <div className="flex items-center justify-between p-4 border-b border-[#e8e3db]">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="text-[#666] hover:text-[#333]"
        >
          ← 返回
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLike}
            className={isLiked ? "text-red-500 hover:text-red-600" : "text-[#666] hover:text-[#333]"}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleShare}
            className="text-[#666] hover:text-[#333]"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 图片轮播 */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={images[selectedImage]}
          alt={location.name}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => {
            setImageOpen(true);
            setSelectedImage(selectedImage);
          }}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`w-2 h-2 rounded-full ${
                index === selectedImage ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <ImageIcon className="h-3 w-3 mr-1" />
          {selectedImage + 1}/{images.length}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* 基本信息 */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-[#333] mb-2">{location.name}</h1>
            <div className="flex items-center text-sm text-[#666] mb-3">
              <MapPin className="h-4 w-4 mr-1 text-[#d4a373]" />
              <span>{location.address}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1 text-[#d4a373] fill-current" />
                <span className="font-medium">{location.rating}</span>
                <span className="text-[#999] ml-2">({Math.floor(Math.random() * 100) + 50}条评论)</span>
              </div>
              <div className="flex items-center text-sm text-[#666]">
                <Clock className="h-4 w-4 mr-1" />
                <span>{location.hours}</span>
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {location.vibe?.map((vibe, index) => (
              <span
                key={index}
                className="bg-[#e8e3db] text-[#666] text-xs px-2 py-1 rounded-full"
              >
                {vibe}
              </span>
            ))}
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-[#e8e3db] mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "overview"
                  ? "text-[#d4a373] border-b-2 border-[#d4a373]"
                  : "text-[#666]"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              详情
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "reviews"
                  ? "text-[#d4a373] border-b-2 border-[#d4a373]"
                  : "text-[#666]"
              }`}
              onClick={() => setActiveTab("reviews")}
            >
              评价
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "photos"
                  ? "text-[#d4a373] border-b-2 border-[#d4a373]"
                  : "text-[#666]"
              }`}
              onClick={() => setActiveTab("photos")}
            >
              照片
            </button>
          </div>

          {/* 标签页内容 */}
          <div className="mb-6">
            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-[#666] mb-4">{location.description}</p>
                <div className="bg-[#f9f7f3] rounded-xl p-4">
                  <h3 className="font-medium text-[#333] mb-2">营业时间</h3>
                  <p className="text-sm text-[#666]">{location.hours}</p>
                </div>
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-[#e8e3db] pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-[#e8e3db] flex items-center justify-center text-sm font-medium text-[#666] mr-2">
                            U{i}
                          </div>
                          <span className="font-medium text-[#333]">用户{i}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-[#d4a373] fill-current" />
                          <span className="ml-1 text-sm">{4 + Math.random()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#666] mb-2">
                        {i === 1
                          ? "这里的氛围真的很好，很适合安静地看书或者工作。咖啡也很香醇。"
                          : i === 2
                          ? "服务态度很好，环境也很舒适。下次还会再来的。"
                          : "位置有点难找，但进去之后发现很值得。推荐给喜欢安静的朋友。"}
                      </p>
                      <p className="text-xs text-[#999]">2023-12-{10 + i} 1{i}:3{i}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "photos" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => {
                        setImageOpen(true);
                        setSelectedImage(index);
                      }}
                    >
                      <img
                        src={image}
                        alt={`${location.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 border-t border-[#e8e3db]">
        <div className="flex space-x-3">
          <Button variant="outline" className="flex-1 border-[#e8e3db] text-[#666]">
            <Phone className="h-4 w-4 mr-2" />
            联系
          </Button>
          <a
            href={`https://uri.amap.com/marker?position=${location.longitude},${location.latitude}&name=${location.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-[#d4a373] hover:bg-[#c99a67] text-white px-4 py-2 rounded-full transition-colors"
          >
             <MapPin className="h-4 w-4 mr-2" />
            去高德地图中查看
          </a>
        </div>
      </div>

      {/* 图片查看器 */}
      {imageOpen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full">
            <button
              className="absolute top-4 right-4 text-white z-10"
              onClick={() => setImageOpen(false)}
            >
              ✕
            </button>
            <img
              src={images[selectedImage]}
              alt={`${location.name} ${selectedImage + 1}`}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === selectedImage ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDetail;
