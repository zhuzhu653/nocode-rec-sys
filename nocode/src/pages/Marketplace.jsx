import { motion } from 'framer-motion';
import Header from '../components/Header';
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDigitalProducts } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Marketplace = () => {
  const navigate = useNavigate();
  const [likedItems, setLikedItems] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 从数据库加载产品数据
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const productsData = await getDigitalProducts();
        setProducts(productsData);
      } catch (err) {
        console.error('加载产品数据失败:', err);
        setError('加载产品数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleLike = (productId) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // 点击产品跳转到详情页
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // 处理查看详情点击（阻止事件冒泡）
  const handleViewDetailsClick = (e, productId) => {
    e.stopPropagation(); // 阻止点击事件冒泡到产品卡片
    handleProductClick(productId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-6 md:py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a373]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-6 md:py-8">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      <div className="container py-6 md:py-8">
        <motion.h1
          className="text-2xl md:text-3xl font-light mb-6 md:mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          数字文创集市
        </motion.h1>

        <motion.p
          className="text-[#666] text-center mb-8 md:mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          探索精美的数字文创产品，收藏传统文化与现代科技的完美结合
        </motion.p>

        {/* 产品网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => handleProductClick(product.id)}
            >
              {/* 产品图片区域 */}
              <div className="relative h-48 md:h-56 overflow-hidden">
                {product.is_3d_model ? (
                  // 3D模型嵌入
                  <iframe
                    title={product.name}
                    frameBorder="0"
                    allowFullScreen
                    mozAllowFullScreen={true}
                    webkitAllowFullScreen={true}
                    allow="autoplay; fullscreen; xr-spatial-tracking"
                    xr-spatial-tracking
                    execution-while-out-of-viewport
                    execution-while-not-rendered
                    web-share
                    src={product.sketchfab_embed_url}
                    className="w-full h-full"
                  />
                ) : (
                  // 普通图片
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* 3D标识 */}
                {product.is_3d_model && (
                  <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    3D模型
                  </div>
                )}

                {/* 收藏按钮 */}
                {/*<button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(product.id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white/80 rounded-full backdrop-blur-sm transition-colors hover:bg-white"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      likedItems.has(product.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-600'
                    }`}
                  />
                </button>*/}
              </div>

              {/* 产品信息 */}
              <div className="p-4 md:p-5">
                <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">
                  {product.name}
                </h3>
                <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-2">
                  {product.short_description || product.description}
                </p>

                {/* 评分和评论 */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-400 fill-current" />
                    <span className="text-xs md:text-sm font-medium text-gray-900 ml-1">
                      {product.rating}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    ({product.review_count}条评论)
                  </span>
                </div>

                {/* 价格信息 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg md:text-xl font-bold text-[#d4a373]">
                      ¥{product.price}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ¥{product.original_price}
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 - 改为查看详情 */}
                <button
                  onClick={(e) => handleViewDetailsClick(e, product.id)}
                  className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white py-2 md:py-3 rounded-lg transition-colors flex items-center justify-center text-sm md:text-base"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  查看详情
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 加载更多按钮 */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <button className="bg-white border border-[#e8e3db] text-[#666] hover:bg-[#f5f3f0] px-6 py-3 rounded-lg transition-colors">
            更多作品敬请期待......
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Marketplace;
