import { motion } from 'framer-motion';
import LocationSearch from '../components/LocationSearch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import LocationList from '../components/LocationList';
import LocationDetail from '../components/LocationDetail';
import FilterPanel from '../components/FilterPanel';
import { MapPin, List, Route, Heart, LogIn, ChevronLeft, ChevronDown, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import MapView from '../components/MapView';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addLikeRecord,
  removeLikeRecord,
  getUserLikedRouteIds,
  getUserLikedLocations,
  getUserLikedLocationIds } from
'@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// 城市配置
const CITIES = [
{ id: 1, name: '北京', pinyin: 'beijing' },
{ id: 2, name: '上海', pinyin: 'shanghai' },
{ id: 3, name: '南京', pinyin: 'nanjing' },
{ id: 4, name: '杭州', pinyin: 'hangzhou' },
{ id: 5, name: '西安', pinyin: 'xian' },
{ id: 6, name: '重庆', pinyin: 'chongqing' }];


const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从URL参数获取当前城市，默认为北京
  const currentCityId = parseInt(searchParams.get('city')) || 1;
  const currentCity = CITIES.find((city) => city.id === currentCityId) || CITIES[0];

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeView, setActiveView] = useState("map");
  const [filters, setFilters] = useState({
    category: [],
    area: [],
    vibe: []
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // 处理城市切换
  const handleCityChange = (cityId) => {
    setSearchParams({ city: cityId.toString() });
    setIsCityDropdownOpen(false);
    // 重置页面状态
    setSelectedLocation(null);
    setSelectedRoute(null);
    setActiveView("map");
    setSearchQuery("");
  };

  // 获取用户点赞的路线ID
  const { data: userLikedRoutes = [] } = useQuery({
    queryKey: ["user-liked-routes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedRoutes = await getUserLikedRouteIds(user.id);
        return likedRoutes;
      } catch (error) {
        console.error('获取用户点赞路线失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取用户点赞的地点ID
  const { data: userLikedLocations = [] } = useQuery({
    queryKey: ["user-liked-locations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const likedLocations = await getUserLikedLocationIds(user.id);
        return likedLocations;
      } catch (error) {
        console.error('获取用户点赞地点失败:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // 获取当前城市的特定位置数据
  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations", currentCityId, filters, searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('city_locations').
      select('*').
      eq('city_id', currentCityId);

      if (error) {
        console.error('获取地点数据失败:', error);
        throw error;
      }

      let filteredLocations = data || [];

      // 应用筛选条件
      if (filters.category.length > 0) {
        filteredLocations = filteredLocations.filter((location) =>
        filters.category.includes(location.type)
        );
      }

      if (filters.vibe.length > 0) {
        filteredLocations = filteredLocations.filter((location) =>
        filters.vibe.some((vibe) => location.vibe.includes(vibe))
        );
      }

      // 应用搜索条件
      if (searchQuery) {
        filteredLocations = filteredLocations.filter((location) =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return filteredLocations;
    }
  });

  // 获取当前城市的特定路线数据
  const { data: routes } = useQuery({
    queryKey: ["routes", currentCityId, searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('city_routes').
      select('*').
      eq('city_id', currentCityId);

      if (error) {
        console.error('获取路线数据失败:', error);
        throw error;
      }

      // 获取路线的点位信息
      const routesWithPoints = await Promise.all(
        (data || []).map(async (route) => {
          const { data: pointsData, error: pointsError } = await supabase.
          from('city_route_points').
          select(`
              order_index,
              city_locations (*)
            `).
          eq('route_id', route.id).
          order('order_index', { ascending: true });

          if (pointsError) {
            console.error('获取路线点位失败:', pointsError);
            return { ...route, points: [] };
          }

          const points = pointsData.map((item) => ({
            ...item.city_locations,
            order_index: item.order_index
          }));

          return { ...route, points };
        })
      );

      let allRoutes = routesWithPoints;

      // 应用搜索条件
      if (searchQuery) {
        allRoutes = allRoutes.filter((route) =>
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return allRoutes;
    }
  });

  // 处理路线点赞
  const handleRouteLike = async (routeId) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const isCurrentlyLiked = userLikedRoutes.includes(routeId);

      if (isCurrentlyLiked) {
        await removeLikeRecord(user.id, routeId, 'route');
      } else {
        await addLikeRecord(user.id, routeId, 'route');
      }

      queryClient.invalidateQueries(["user-liked-routes"]);

    } catch (error) {
      console.error('路线点赞操作失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 处理地点点赞
  const handleLocationLike = async (locationId) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const isCurrentlyLiked = userLikedLocations.includes(locationId);

      if (isCurrentlyLiked) {
        await removeLikeRecord(user.id, locationId, 'location');
      } else {
        await addLikeRecord(user.id, locationId, 'location');
      }

      queryClient.invalidateQueries(["user-liked-locations"]);

    } catch (error) {
      console.error('地点点赞操作失败:', error);
      alert('操作失败，请稍后重试');
    }
  };

  // 检查路线是否被点赞
  const isRouteLiked = (routeId) => {
    return userLikedRoutes.includes(routeId);
  };

  // 检查地点是否被点赞
  const isLocationLiked = (locationId) => {
    return userLikedLocations.includes(locationId);
  };

  // 处理登录跳转
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/auth');
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setActiveView("detail");
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setActiveView("detail");
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    // 如果搜索查询不为空，尝试自动跳转到匹配的结果
    if (query.trim()) {
      // 首先检查是否有匹配的路线
      const matchedRoute = routes?.find((route) =>
      route.name.toLowerCase().includes(query.toLowerCase()) ||
      route.description.toLowerCase().includes(query.toLowerCase())
      );

      if (matchedRoute) {
        // 跳转到路线详情
        handleViewRouteDetail(matchedRoute);
        return;
      }

      // 然后检查是否有匹配的地点
      const matchedLocation = locations?.find((location) =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.description.toLowerCase().includes(query.toLowerCase()) ||
      location.category.toLowerCase().includes(query.toLowerCase())
      );

      if (matchedLocation) {
        // 跳转到地点详情
        handleLocationSelect(matchedLocation);
        return;
      }
    }
  };

  // 处理路线详情查看
  const handleViewRouteDetail = (route) => {
    setSelectedRoute(route);
    setActiveView("route-detail");
  };

  // 返回路线列表
  const handleBackToRoutes = () => {
    setSelectedRoute(null);
    setActiveView("route");
  };

  // 返回地图视图
  const handleBackToMap = () => {
    setSelectedLocation(null);
    setActiveView("map");
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      <div className="container py-4 md:py-8">
        {/* 头部标题和城市选择器 */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <motion.h1
            className="text-2xl md:text-3xl font-light"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>

            灵感地图 - {currentCity.name}
          </motion.h1>

          {/* 城市选择下拉框 */}
          <div className="relative">
            <div />








            {isCityDropdownOpen &&
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[#e8e3db] rounded-lg shadow-lg z-50 py-1">
                {CITIES.map((city) =>
              <button
                key={city.id}
                onClick={() => handleCityChange(city.id)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#f9f7f3] transition-colors ${
                currentCityId === city.id ?
                'bg-[#d4a373] text-white' :
                'text-[#333]'}`
                }>

                    {city.name}
                  </button>
              )}
              </div>
            }
          </div>
        </div>

        {/* 搜索框 */}
        <LocationSearch onSearch={handleSearch} />

        {/* 视图切换按钮 */}
        {activeView !== "detail" && activeView !== "route-detail" &&
        <div className="flex items-center space-x-2 md:space-x-4 mb-4 md:mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <button
            onClick={() => {
              setActiveView("map");
              setSelectedRoute(null);
            }}
            className={`flex items-center px-3 py-2 md:px-4 md:py-2 rounded-full transition-colors text-sm md:text-base whitespace-nowrap ${
            activeView === "map" ?
            "bg-[#d4a373] text-white" :
            "bg-[#e8e3db] text-[#666] hover:bg-[#d4a373]/20"}`
            }>

              <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              地图
            </button>
            <button
            onClick={() => {
              setActiveView("list");
              setSelectedRoute(null);
            }}
            className={`flex items-center px-3 py-2 md:px-4 md:py-2 rounded-full transition-colors text-sm md:text-base whitespace-nowrap ${
            activeView === "list" ?
            "bg-[#d4a373] text-white" :
            "bg-[#e8e3db] text-[#666] hover:bg-[#d4a373]/20"}`
            }>

              <List className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              列表
            </button>
            <button
            onClick={() => {
              setActiveView("route");
              setSelectedRoute(null);
            }}
            className={`flex items-center px-3 py-2 md:px-4 md:py-2 rounded-full transition-colors text-sm md:text-base whitespace-nowrap ${
            activeView === "route" ?
            "bg-[#d4a373] text-white" :
            "bg-[#e8e3db] text-[#666] hover:bg-[#d4a373]/20"}`
            }>

              <Route className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              路线
            </button>
          </div>
        }

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-[500px] md:h-[600px]">
          {/* 左侧面板 */}
          <div className="lg:col-span-1 bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
            {activeView === "list" &&
            <LocationList
              locations={locations || []}
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              onLocationLike={handleLocationLike}
              userLikedLocations={userLikedLocations}
              user={user}
              onLoginRequired={() => setShowLoginPrompt(true)} />

            }

            {activeView === "route" &&
            <div className="p-3 md:p-4">
                <h2 className="text-lg md:text-xl font-light text-[#333] mb-3 md:mb-4">{currentCity.name}主题路线</h2>
                <div className="space-y-3 md:space-y-4">
                  {routes?.map((route, index) =>
                <motion.div
                  key={route.id}
                  className="p-3 md:p-4 rounded-lg md:rounded-xl border border-[#e8e3db] hover:border-[#d4a373]/50 cursor-pointer transition-all relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}>

                      {/* 点赞按钮 */}
                      <button
                    className={`absolute top-2 right-2 md:top-3 md:right-3 p-1 md:p-2 rounded-full transition-all ${
                    isRouteLiked(route.id) ?
                    'bg-red-50 hover:bg-red-100 text-red-500' :
                    'hover:bg-[#e8e3db] text-[#999] hover:text-[#666]'}`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRouteLike(route.id);
                    }}
                    title={isRouteLiked(route.id) ? "取消点赞" : "点赞"}>

                        <Heart
                      className={`h-3 w-3 md:h-5 md:w-5 ${
                      isRouteLiked(route.id) ? "fill-current" : ""}`
                      } />

                      </button>

                      <h3 className="font-medium text-[#333] pr-8 md:pr-12 text-sm md:text-base">{route.name}</h3>
                      <p className="text-xs md:text-sm text-[#666] mt-1">{route.description}</p>
                      <div className="mt-2 md:mt-3 flex justify-between items-center">
                        <span className="text-xs text-[#999]">{route.points.length} 个点位</span>
                        <button
                      className="bg-[#d4a373] hover:bg-[#c99a67] text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs transition-colors"
                      onClick={() => handleViewRouteDetail(route)}>

                          查看路线
                        </button>
                      </div>
                    </motion.div>
                )}
                </div>
              </div>
            }

            {activeView === "route-detail" && selectedRoute &&
            <div className="h-full flex flex-col">
                {/* 路线详情头部 */}
                <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#e8e3db]">
                  <button
                  onClick={handleBackToRoutes}
                  className="text-[#666] hover:text-[#333] flex items-center">

                    <ChevronLeft className="h-4 w-4 mr-1" />
                    返回
                  </button>
                  <h2 className="text-base md:text-lg font-medium text-[#333]">路线详情</h2>
                  {/* 路线详情页的点赞按钮 */}
                  <button
                  className={`p-1 md:p-2 rounded-full transition-all ${
                  isRouteLiked(selectedRoute.id) ?
                  'bg-red-50 hover:bg-red-100 text-red-500' :
                  'hover:bg-[#e8e3db] text-[#999] hover:text-[#666]'}`
                  }
                  onClick={() => handleRouteLike(selectedRoute.id)}
                  title={isRouteLiked(selectedRoute.id) ? "取消点赞" : "点赞"}>

                    <Heart
                    className={`h-4 w-4 md:h-5 md:w-5 ${
                    isRouteLiked(selectedRoute.id) ? "fill-current" : ""}`
                    } />

                  </button>
                </div>

                {/* 路线信息 */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4">
                  <h3 className="text-lg md:text-xl font-medium text-[#333] mb-2">{selectedRoute.name}</h3>
                  <p className="text-[#666] mb-4 md:mb-6 text-sm md:text-base">{selectedRoute.description}</p>
                  <h4 className="font-medium text-[#333] mb-2 md:mb-3 text-sm md:text-base">路线点位</h4>
                  <div className="space-y-3 md:space-y-4">
                    {selectedRoute.points.map((point, index) =>
                  <div
                    key={point.id}
                    className="flex items-start p-2 md:p-3 rounded-lg border border-[#e8e3db]">

                        <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#d4a373] flex items-center justify-center text-white text-xs md:text-sm font-medium mr-2 md:mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-[#333] text-sm md:text-base">{point.name}</h5>
                          <p className="text-xs md:text-sm text-[#666] mt-1">{point.description}</p>
                          <div className="flex items-center mt-1 md:mt-2 text-xs text-[#999]">
                            <span>{point.category}</span>
                            <span className="mx-1 md:mx-2">•</span>
                            <span className="truncate" title={point.address}>{point.address}</span>
                          </div>
                        </div>
                      </div>
                  )}
                  </div>
                </div>

                {/* 底部操作按钮 */}
                <div className="p-3 md:p-4 border-t border-[#e8e3db]">
                  <a
                  href={`https://uri.amap.com/navigation?from=&to=${selectedRoute.points[0]?.longitude},${selectedRoute.points[0]?.latitude}&mode=car&src=mypage&coordinate=gaode&callnative=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white py-2 rounded-full transition-colors text-center block text-sm md:text-base">

                    开始探索
                  </a>
                </div>
              </div>
            }

            {activeView === "map" &&
            <div className="p-3 md:p-4">
                <h2 className="text-lg md:text-xl font-light text-[#333] mb-3 md:mb-4">筛选</h2>
                <p className="text-xs md:text-sm text-[#666] mb-3 md:mb-4">
                  使用左侧筛选面板选择您感兴趣的创意据点类型、区域和氛围标签。
                </p>
                <button
                onClick={() => setIsFilterOpen(true)}
                className="w-full py-2 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg transition-colors text-sm md:text-base">

                  打开筛选
                </button>
              </div>
            }

            {activeView === "detail" && selectedLocation &&
            <LocationDetail
              location={selectedLocation}
              onBack={handleBackToMap}
              onLocationLike={handleLocationLike}
              isLiked={isLocationLiked(selectedLocation?.id)}
              user={user}
              onLoginRequired={() => setShowLoginPrompt(true)} />

            }
          </div>

          {/* 右侧地图 */}
          <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
            {isLoading ?
            <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-t-2 border-b-2 border-[#d4a373]"></div>
              </div> :
            activeView === "detail" ?
            <div className="w-full h-full">
                <iframe
                src={`https://uri.amap.com/marker?position=${selectedLocation?.longitude},${selectedLocation?.latitude}&name=${selectedLocation?.name}`}
                className="w-full h-full border-0"
                title="高德地图"
                allowFullScreen />

              </div> :
            activeView === "route-detail" ?
            <div className="w-full h-full">
                <MapView
                locations={selectedRoute?.points || []}
                routes={selectedRoute ? [selectedRoute] : []}
                onLocationClick={handleLocationClick} />

              </div> :

            <MapView
              locations={locations || []}
              routes={routes || []}
              onLocationClick={handleLocationClick} />

            }
          </div>
        </div>
      </div>

      {/* 筛选面板 */}
      <FilterPanel
        isOpen={isFilterOpen}
        onToggle={() => setIsFilterOpen(!isFilterOpen)}
        onFilterChange={handleFilterChange}
        filters={filters} />


      {/* 登录提示模态框 */}
      {showLoginPrompt &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 w-full max-w-md">
            <div className="text-center mb-4 md:mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <LogIn className="h-6 w-6 md:h-8 md:w-8 text-[#d4a373]" />
              </div>
              <h2 className="text-lg md:text-xl font-medium text-[#333] mb-2">请先登录</h2>
              <p className="text-[#666] text-xs md:text-sm">登录后可以收藏喜欢的路线和地点，并在个人中心查看。</p>
            </div>

            <div className="flex flex-col gap-2 md:gap-3">
              <Button
              className="w-full h-10 md:h-11 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg font-medium text-sm md:text-base"
              onClick={handleLoginRedirect}>

                立即登录/注册
              </Button>
              <Button
              variant="outline"
              className="w-full h-10 md:h-11 border-[#e8e3db] text-[#666] hover:bg-[#e8e3db] rounded-lg text-sm md:text-base"
              onClick={() => setShowLoginPrompt(false)}>

                稍后再说
              </Button>
            </div>
          </div>
        </div>
      }
    </div>);

};

export default Discover;
