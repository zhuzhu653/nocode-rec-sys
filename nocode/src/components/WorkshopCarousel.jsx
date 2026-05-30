import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkshopCard from "./WorkshopCard";

const WorkshopCarousel = ({ workshops }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(workshops.length / itemsPerPage);

  const nextPage = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const visibleWorkshops = workshops.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWorkshops.map((workshop, index) => (
          <WorkshopCard 
            key={workshop.id} 
            workshop={workshop} 
            index={index} 
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <>
          <button 
            onClick={prevPage}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-md"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={nextPage}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-md"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          <div className="flex justify-center mt-6 space-x-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? "bg-[#d4a373]" : "bg-[#e8e3db]"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkshopCarousel;
