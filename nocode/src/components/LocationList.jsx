import { motion } from "framer-motion";
import { MapPin, Star, Clock, Heart } from "lucide-react";

const LocationList = ({ locations, onLocationSelect, selectedLocation, onLocationLike, userLikedLocations, user, onLoginRequired }) => {

  const handleLikeClick = (e, locationId) => {
    e.stopPropagation();
    if (!user) {
      onLoginRequired();
      return;
    }
    onLocationLike(locationId);
  };

  const isLocationLiked = (locationId) => {
    return userLikedLocations.includes(locationId);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <h2 className="text-xl font-light text-[#333] mb-4">创意据点</h2>
      
      <div className="space-y-4">
        {locations.map((location, index) => (
          <motion.div
            key={location.id}
            className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
              selectedLocation?.id === location.id
                ? "border-[#d4a373] bg-[#d4a373]/10"
                : "border-[#e8e3db] hover:border-[#d4a373]/50"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onClick={() => onLocationSelect(location)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* 点赞按钮 */}
            <button
              className={`absolute top-3 right-3 p-1 rounded-full transition-all ${
                isLocationLiked(location.id)
                  ? 'bg-red-50 hover:bg-red-100 text-red-500'
                  : 'hover:bg-[#e8e3db] text-[#999] hover:text-[#666]'
              }`}
              onClick={(e) => handleLikeClick(e, location.id)}
              title={isLocationLiked(location.id) ? "取消点赞" : "点赞"}
            >
              <Heart
                className={`h-4 w-4 ${
                  isLocationLiked(location.id) ? "fill-current" : ""
                }`}
              />
            </button>

            <div className="flex items-start pr-8">
              <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                <img
                  src={`https://nocode.meituan.com/photo/search?keyword=${location.type},creative&width=100&height=100`}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-[#333]">{location.name}</h3>
                <p className="text-sm text-[#666] mt-1 line-clamp-2">{location.description}</p>
                
                <div className="flex items-center mt-2 text-xs text-[#999]">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="mr-3 truncate flex-shrink-0" title={location.address}>{location.address}</span>
                  
                  <Star className="h-3 w-3 mr-1 text-[#d4a373] flex-shrink-0" />
                  <span className="mr-3 flex-shrink-0">{location.rating}</span>
                  
                  <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate flex-shrink-0" title={location.hours}>{location.hours}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LocationList;
