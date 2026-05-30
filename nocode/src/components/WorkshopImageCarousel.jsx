import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WorkshopImageCarousel = ({ images = [], title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // 如果没有图片，显示占位符
  if (images.length === 0) {
    return (
      <div className="relative mb-8 rounded-2xl overflow-hidden h-96 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">暂无图片</span>
      </div>
    );
  }

  return (
    <div className="relative mb-8 rounded-2xl overflow-hidden h-96">
      <img 
        src={images[currentIndex]} 
        alt={title}
        className="w-full h-full object-cover"
      />
      
      {images.length > 1 && (
        <>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-md"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-md"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkshopImageCarousel;
