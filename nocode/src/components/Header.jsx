import { Search, ChevronDown, MapPin, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import { useState, useEffect, useRef } from "react";
import MobileNav from "./MobileNav";
import { searchInstructors } from "../integrations/supabase/client";
import { searchDigitalProducts } from "../integrations/supabase/client";

// 搜索建议类型定义
const SEARCH_TYPES = {
  PAGE: "page",
  INSTRUCTOR: "instructor",
  ROUTE: "route",
  LOCATION: "location",
  PRODUCT: "product",
  STORY: "story"
};

// 页面搜索数据
const PAGE_SEARCH_DATA = [
  { title: "首页", path: "/", type: SEARCH_TYPES.PAGE, keywords: ["首页", "主页", "灵感流"] },
  { title: "发现", path: "/discover", type: SEARCH_TYPES.PAGE, keywords: ["发现", "探索", "城市发现"] },
  { title: "北京发现", path: "/discover?city=1", type: SEARCH_TYPES.PAGE, keywords: ["北京", "beijing"] },
  { title: "上海发现", path: "/discover?city=2", type: SEARCH_TYPES.PAGE, keywords: ["上海", "shanghai"] },
  { title: "南京发现", path: "/discover?city=3", type: SEARCH_TYPES.PAGE, keywords: ["南京", "nanjing"] },
  { title: "杭州发现", path: "/discover?city=4", type: SEARCH_TYPES.PAGE, keywords: ["杭州", "hangzhou"] },
  { title: "西安发现", path: "/discover?city=5", type: SEARCH_TYPES.PAGE, keywords: ["西安", "xian"] },
  { title: "重庆发现", path: "/discover?city=6", type: SEARCH_TYPES.PAGE, keywords: ["重庆", "chongqing"] },
  { title: "体验", path: "/experience", type: SEARCH_TYPES.PAGE, keywords: ["体验", "工作坊", "课程"] },
  { title: "社区", path: "/community", type: SEARCH_TYPES.PAGE, keywords: ["社区", "故事", "分享"] },
  { title: "达人", path: "/instructors", type: SEARCH_TYPES.PAGE, keywords: ["达人", "导师", "艺术家"] },
  { title: "集市", path: "/marketplace", type: SEARCH_TYPES.PAGE, keywords: ["集市", "商品", "购物"] },
  { title: "购物车", path: "/cart", type: SEARCH_TYPES.PAGE, keywords: ["购物车", "cart"] },
  { title: "用户中心", path: "/user-center", type: SEARCH_TYPES.PAGE, keywords: ["用户中心", "个人中心"] },
  { title: "设置", path: "/settings", type: SEARCH_TYPES.PAGE, keywords: ["设置", "settings"] }
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState("北京");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  
  const cities = ["北京", "上海", "南京", "杭州", "西安", "重庆", "待开发中..."];

  // 城市名称到城市ID的映射
  const cityToId = {
    "北京": 1,
    "上海": 2,
    "南京": 3,
    "杭州": 4,
    "西安": 5,
    "重庆": 6
  };

  // 根据当前路由自动更新选中的城市
  useEffect(() => {
    const pathToCity = {
      "/discover/beijing": "北京",
      "/discover/shanghai": "上海",
      "/discover/nanjing": "南京",
      "/discover/hangzhou": "杭州",
      "/discover/xian": "西安",
      "/discover/chongqing": "重庆",
      "/discover": "北京" // 默认发现页面重定向到北京
    };

    const currentCity = pathToCity[location.pathname] || "北京";
    setSelectedCity(currentCity);
  }, [location.pathname]);

  // 搜索功能
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const query = searchQuery.toLowerCase().trim();
      const results = [];

      try {
        // 搜索页面
        PAGE_SEARCH_DATA.forEach(item => {
          const titleMatch = item.title.toLowerCase().includes(query);
          const keywordMatch = item.keywords.some(keyword =>
            keyword.toLowerCase().includes(query)
          );

          if (titleMatch || keywordMatch) {
            results.push({
              ...item,
              matchScore: titleMatch ? 2 : 1 // 标题匹配得分更高
            });
          }
        });

// 搜索达人
        if (query.length > 1) { // 至少2个字符才搜索达人
          try {
            const instructors = await searchInstructors(query);
            instructors.forEach(instructor => {
              results.push({
                id: instructor.id,
                title: instructor.name,
                description: instructor.bio,
                path: `/instructor/${instructor.id}`,
                type: SEARCH_TYPES.INSTRUCTOR,
                image: instructor.avatar,
                matchScore: 3 // 达人搜索得分最高
              });
            });
          } catch (error) {
            console.warn('搜索达人失败:', error);
          }
        }

        // 搜索商品
        if (query.length > 1) { // 至少2个字符才搜索商品
          try {
            const products = await searchDigitalProducts(query);
            products.forEach(product => {
              results.push({
                id: product.id,
                title: product.name,
                description: product.description,
                path: `/product/${product.id}`,
                type: SEARCH_TYPES.PRODUCT,
                image: product.image_url,
                price: product.price,
                matchScore: 3 // 商品搜索得分最高
              });
            });
          } catch (error) {
            console.warn('搜索商品失败:', error);
          }
        }

        // 按匹配分数排序
        results.sort((a, b) => b.matchScore - a.matchScore);

        setSearchResults(results.slice(0, 20)); // 限制结果数量
        setShowSearchResults(results.length > 0);
        setSelectedResultIndex(-1);
      } catch (error) {
        console.error('搜索出错:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    // 防抖搜索
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 处理搜索输入变化
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // 处理搜索提交
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      // 如果有选中的结果，导航到该结果
      if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
        navigateToResult(searchResults[selectedResultIndex]);
      } else if (searchResults.length > 0) {
        // 否则导航到第一个结果
        navigateToResult(searchResults[0]);
      } else {
        // 没有匹配结果，可以跳转到搜索页面或显示提示
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }

      setSearchQuery("");
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  // 导航到搜索结果
  const navigateToResult = (result) => {
    navigate(result.path);
  };

  // 处理键盘导航
  const handleKeyDown = (e) => {
    if (!showSearchResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedResultIndex(prev =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        handleSearchSubmit();
        break;
      case 'Escape':
        setShowSearchResults(false);
        searchInputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchResultsRef.current &&
          !searchResultsRef.current.contains(e.target) &&
          searchInputRef.current !== e.target) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理城市选择
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setShowCityDropdown(false);

    // 检查当前页面类型
    const isDiscoverPage = location.pathname.startsWith("/discover");
    const isExperiencePage = location.pathname === "/experience";

    if (isDiscoverPage) {
      // 在发现页面：更新URL参数，不跳转页面
      const cityId = cityToId[city];
      if (cityId) {
        // 使用URLSearchParams来更新city参数
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('city', cityId.toString());
        navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
      }
    } else if (isExperiencePage) {
      // 在体验页面：通过URL参数传递城市ID进行筛选
      const cityId = cityToId[city];
      if (cityId) {
        navigate(`/experience?city=${cityId}`);
      } else {
        navigate('/experience');
      }
    } else {
      // 其他页面：默认导航到发现页面
      navigate("/discover");
    }
  };

  // 检查当前是否为首页
  const isHomePage = location.pathname === "/";

  // 检查当前是否为社区或达人页面
  const isCommunityPage = location.pathname === "/community";
  const isInstructorsPage = location.pathname === "/instructors";
  const isMarketplacePage = location.pathname === "/marketplace";
  const isCartPage = location.pathname === "/cart"; // 添加购物车页面

  // 检查当前是否为达人详情页或产品详情页
  const isInstructorDetailPage = location.pathname.startsWith("/instructor/");
  const isProductDetailPage = location.pathname.startsWith("/product/");

  // 在这些页面隐藏城市切换选项
  const shouldHideCitySelector = isHomePage || isCommunityPage || isInstructorsPage || isMarketplacePage || isCartPage || isInstructorDetailPage || isProductDetailPage;

  // 获取类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case SEARCH_TYPES.INSTRUCTOR:
        return "👤";
      case SEARCH_TYPES.PRODUCT:
        return "🛒";
      case SEARCH_TYPES.PAGE:
        return "📄";
      default:
        return "🔍";
    }
  };

  // 获取类型名称
  const getTypeName = (type) => {
    switch (type) {
      case SEARCH_TYPES.INSTRUCTOR:
        return "达人";
      case SEARCH_TYPES.PRODUCT:
        return "商品";
      case SEARCH_TYPES.PAGE:
        return "页面";
      default:
        return "搜索结果";
    }
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 w-full border-b border-[#e8e3db] bg-[#f9f7f3]/90 backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-light text-xl md:text-2xl text-[#333] whitespace-nowrap">
              <span className="font-serif">循踪觅意 Tracing & Meaning</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-light">
            <Link 
              to="/" 
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/" ? "text-[#d4a373]" : ""
              }`}
            >
              灵感流
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/" ? "w-full" : ""
              }`}></span>
            </Link>
            <Link 
              to="/discover" 
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/discover" ? "text-[#d4a373]" : ""
              }`}
            >
              发现
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/discover" ? "w-full" : ""
              }`}></span>
            </Link>
            <Link 
              to="/experience" 
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/experience" ? "text-[#d4a373]" : ""
              }`}
            >
              体验
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/experience" ? "w-full" : ""
              }`}></span>
            </Link>
            <Link 
              to="/community" 
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/community" ? "text-[#d4a373]" : ""
              }`}
            >
              社区
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/community" ? "w-full" : ""
              }`}></span>
            </Link>
            <Link 
              to="/instructors" 
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/instructors" ? "text-[#d4a373]" : ""
              }`}
            >
              达人
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/instructors" ? "w-full" : ""
              }`}></span>
            </Link>
            {/* 添加集市导航链接 */}
            <Link
              to="/marketplace"
              className={`relative text-[#333] hover:text-[#d4a373] transition-colors duration-300 group ${
                location.pathname === "/marketplace" ? "text-[#d4a373]" : ""
              }`}
            >
              集市
              <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d4a373] transition-all duration-300 group-hover:w-full ${
                location.pathname === "/marketplace" ? "w-full" : ""
              }`}></span>
            </Link>
          </nav>
        </div>

        {/* 移动端导航按钮 */}
        <div className="md:hidden ml-auto">
          <MobileNav />
        </div>

        <div className="hidden md:flex flex-1 items-center justify-end space-x-4">
          {/* 城市切换下拉菜单 - 在首页隐藏 */}
          {!shouldHideCitySelector && (
            <div className="relative">
              <button
                className="flex items-center space-x-1 px-3 py-2 text-sm text-[#666] hover:text-[#333] transition-colors rounded-full hover:bg-[#e8e3db]"
                onClick={() => setShowCityDropdown(!showCityDropdown)}
              >
                <MapPin className="h-4 w-4" />
                <span>{selectedCity}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showCityDropdown && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-[#e8e3db] py-1 z-50">
                  {cities.map((city) => (
                    <button
                      key={city}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f9f7f3] transition-colors ${
                        selectedCity === city ? 'text-[#d4a373] font-medium' : 'text-[#666]'
                      }`}
                      onClick={() => handleCitySelect(city)}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative" ref={searchResultsRef}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#999]" />
              {searchQuery && (
                <button
                  className="absolute right-2.5 top-2.5 h-4 w-4 text-[#999] hover:text-[#666]"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <input
                ref={searchInputRef}
                type="search"
                placeholder="搜索灵感、达人、活动、商品..."
                className="w-full rounded-full border border-[#e8e3db] bg-[#f9f7f3] pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-[#999] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373]"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              />

              {/* 搜索结果下拉框 */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e8e3db] py-2 z-50 max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-[#999] flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-[#d4a373] border-t-transparent rounded-full mr-2"></div>
                      搜索中...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#999]">
                      没有找到相关结果
                    </div>
                  ) : (
                    searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id || result.path}-${index}`}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f9f7f3] transition-colors flex items-center ${
                          selectedResultIndex === index ? 'bg-[#f9f7f3] text-[#d4a373]' : 'text-[#666]'
                        }`}
                        onClick={() => {
                          navigateToResult(result);
                          setSearchQuery("");
                          setShowSearchResults(false);
                        }}
                        onMouseEnter={() => setSelectedResultIndex(index)}
                      >
                        <div className="flex-shrink-0 mr-3 text-lg">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          {result.description && (
                            <div className="text-xs text-[#999] truncate mt-1">
                              {result.description}
                            </div>
                          )}
                          <div className="text-xs text-[#999] mt-1">
                            {getTypeName(result.type)}
                            {result.price && (
                              <span className="ml-2 text-[#d4a373] font-medium">
                                ¥{result.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 添加购物车图标按钮 */}
          <Link
            to="/cart"
            className="p-2 text-[#666] hover:text-[#d4a373] transition-colors rounded-full hover:bg-[#e8e3db]"
            title="购物车"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {/* 添加集市图标按钮 */}
          <Link
            to="/marketplace"
            className="p-2 text-[#666] hover:text-[#d4a373] transition-colors rounded-full hover:bg-[#e8e3db]"
            title="数字文创集市"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>

          <NotificationBell />
          <UserMenu />
        </div>

        {/* 移动端搜索和用户菜单 */}
        <div className="md:hidden flex items-center space-x-2 ml-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* 移动端搜索栏 */}
      <div className="md:hidden border-t border-[#e8e3db] bg-[#f9f7f3] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#999]" />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#999] hover:text-[#666]"
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <input
            type="search"
            placeholder="搜索灵感、达人、活动、商品..."
            className="w-full rounded-full border border-[#e8e3db] bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#999] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a373]"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
          />

          {/* 移动端搜索结果下拉框 */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e8e3db] py-2 z-50 max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-[#999] flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-[#d4a373] border-t-transparent rounded-full mr-2"></div>
                  搜索中...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[#999]">
                  没有找到相关结果
                </div>
              ) : (
                searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id || result.path}-${index}`}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f9f7f3] transition-colors flex items-center ${
                      selectedResultIndex === index ? 'bg-[#f9f7f3] text-[#d4a373]' : 'text-[#666]'
                    }`}
                    onClick={() => {
                      navigateToResult(result);
                      setSearchQuery("");
                      setShowSearchResults(false);
                    }}
                    onMouseEnter={() => setSelectedResultIndex(index)}
                  >
                    <div className="flex-shrink-0 mr-3 text-lg">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.description && (
                        <div className="text-xs text-[#999] truncate mt-1">
                          {result.description}
                        </div>
                      )}
                      <div className="text-xs text-[#999] mt-1">
                        {getTypeName(result.type)}
                        {result.price && (
                          <span className="ml-2 text-[#d4a373] font-medium">
                            ¥{result.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
