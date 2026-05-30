import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const MapView = ({ locations, routes, onLocationClick }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindow, setInfoWindow] = useState(null);

  useEffect(() => {
    // 确保高德地图加载器已加载
    if (window.AMapLoader) {
      window.AMapLoader.load({
        key: "d8efafb01851ae9d45f0a8ba3f031a24", // 申请好的Web端开发者 Key
        version: "2.0", // 指定要加载的 JS API 的版本
        plugins: ["AMap.Marker", "AMap.Polyline", "AMap.InfoWindow"],
      })
        .then((AMap) => {
          const mapInstance = new AMap.Map(mapRef.current, {
            zoom: 12,
            center: [116.397428, 39.90923], // 默认北京中心
            mapStyle: "amap://styles/whitesmoke",
          });

          setMap(mapInstance);

          // 创建信息窗体
          const infoWindowInstance = new AMap.InfoWindow({
            isCustom: false,
            offset: new AMap.Pixel(0, -30),
          });
          setInfoWindow(infoWindowInstance);

          return mapInstance;
        })
        .catch((e) => {
          console.error("地图加载失败", e);
        });
    }

    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!map || !locations || locations.length === 0) return;

    // 清除现有标记
    markers.forEach((marker) => map.remove(marker));
    setMarkers([]);

    // 创建新标记
    const newMarkers = locations.map((location) => {
      const marker = new window.AMap.Marker({
        position: [location.longitude, location.latitude],
        title: location.name,
        icon: getIconByType(location.type),
        extData: location,
      });

      // 点击标记显示信息窗体
      marker.on("click", () => {
        const content = `
          <div class="p-3">
            <h3 class="font-medium text-[#333]">${location.name}</h3>
            <p class="text-sm text-[#666] mt-1">${location.description}</p>
            <div class="mt-2">
              <span class="text-xs text-[#999]">${location.category}</span>
            </div>
            <button class="mt-2 bg-[#d4a373] hover:bg-[#c99a67] text-white px-3 py-1 rounded-full text-xs transition-colors" onclick="window.handleMarkerClick(${location.id})">
              查看详情
            </button>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker.getPosition());
        onLocationClick && onLocationClick(location);
      });

      return marker;
    });

    // 添加标记到地图
    map.add(newMarkers);
    setMarkers(newMarkers);

    // 调整视图以包含所有标记
    if (newMarkers.length > 0) {
      map.setFitView();
    }
  }, [map, locations, onLocationClick]);

  // 根据类型获取不同图标
  const getIconByType = (type) => {
    const iconMap = {
      bookstore: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b1.png",
      gallery: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b2.png",
      cafe: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b3.png",
      workshop: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b4.png",
      museum: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b5.png",
      park: "https://webapi.amap.com/theme/v1.3/markers/n/mark_b6.png",
    };
    return iconMap[type] || "https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png";
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
      <motion.div 
        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#d4a373] mr-2"></div>
            <span className="text-xs text-[#666]">书店</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#6b8e23] mr-2"></div>
            <span className="text-xs text-[#666]">画廊</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#8b4513] mr-2"></div>
            <span className="text-xs text-[#666]">咖啡馆</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MapView;
