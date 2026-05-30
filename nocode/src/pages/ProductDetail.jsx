import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Heart, ShoppingCart, Star, ArrowLeft, CreditCard } from 'lucide-react';
import { getDigitalProductById, addToCart } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import LoginPrompt from '@/components/LoginPrompt'; // 导入统一的登录提示组件

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    loadProductData();
  }, [id]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      const productData = await getDigitalProductById(id);
      setProduct(productData);
    } catch (error) {
      console.error('加载产品详情错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  // 统一的登录提示处理函数
  const showLoginPromptIfNeeded = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return true;
    }
    return false;
  };

  // 处理登录跳转
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/auth');
  };

  const handleAddToCart = async () => {
    console.log('点击加入购物车按钮');
    if (showLoginPromptIfNeeded()) return;

    try {
      console.log('正在添加商品到购物车:', product.id);
      await addToCart(user.id, product.id);
      console.log('添加到购物车成功');
      alert('已添加到购物车！');
    } catch (error) {
      console.error('添加到购物车错误:', error);
      if (error.message === '您已拥有该商品，请勿重复购买！') {
        alert('您已拥有该商品，请勿重复购买！');
      } else {
        alert('添加到购物车失败');
      }
    }
  };

  const handleBuyNow = async () => {
    console.log('点击立即购买按钮');
    if (showLoginPromptIfNeeded()) return;

    try {
      console.log('正在添加商品到购物车并跳转:', product.id);
      await addToCart(user.id, product.id);
      console.log('添加到购物车成功，跳转到购物车页面');
      navigate('/cart');
    } catch (error) {
      console.error('立即购买错误:', error);
      if (error.message === '您已拥有该商品，请勿重复购买！') {
        alert('您已拥有该商品，请勿重复购买！');
      } else {
        alert('操作失败');
      }
    }
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

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-6 md:py-8">
          <div className="text-center">
            <p>产品不存在</p>
            <button onClick={() => navigate('/marketplace')} className="mt-4 text-[#d4a373]">
              返回集市
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      <div className="container py-6 md:py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center text-[#666] hover:text-[#d4a373] mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回集市
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 产品图片 */}
          <div className="bg-white rounded-xl p-6">
            {product.is_3d_model ? (
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
                className="w-full h-96 rounded-lg"
              />
            ) : (
              <img
                src={product.thumbnail_url}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            )}

            {/* 3D标识 */}
            {product.is_3d_model && (
              <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                3D模型
              </div>
            )}

            {/* 收藏按钮 */}
            <button
              onClick={handleLike}
              className="absolute top-3 right-3 p-2 bg-white/80 rounded-full backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Heart
                className={`h-4 w-4 ${
                  liked ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }`}
              />
            </button>
          </div>

          {/* 产品信息 */}
          <div className="bg-white rounded-xl p-6">
            <h1 className="text-2xl md:text-3xl font-light mb-4">{product.name}</h1>
            <p className="text-gray-600 mb-6">{product.description}</p>

            {/* 价格信息 */}
            <div className="flex items-center mb-6">
              <span className="text-2xl font-bold text-[#d4a373]">¥{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-lg text-gray-500 line-through ml-3">
                  ¥{product.original_price}
                </span>
              )}
            </div>

            {/* 评分信息 */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="text-lg font-medium ml-1">{product.rating}</span>
              </div>
              <span className="text-gray-500 ml-2">({product.review_count}条评价)</span>
            </div>

            {/* 操作按钮 - 加入购物车和立即购买 */}
            <div className="space-y-3 mb-6">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#e8e3db] hover:bg-[#d4a373] text-[#666] hover:text-white py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                加入购物车
              </button>

              <button
                onClick={handleBuyNow}
                className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                立即购买
              </button>
            </div>

            {/* 产品详情信息 */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-light mb-4">产品详情</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">分类:</span> {product.category}</p>
                <p><span className="font-medium">标签:</span> {product.tags?.join(', ')}</p>
                {product.is_3d_model && (
                  <p className="text-blue-500">✅ 包含3D模型</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 评价部分 - 预留位置 */}
        <div className="bg-white rounded-xl p-6 mt-8">
          <h2 className="text-xl font-light mb-4">用户评价</h2>
          <p className="text-gray-500 text-center">暂无评价</p>
        </div>
      </div>

      {/* 使用统一的登录提示组件 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginRedirect}
        title="请先登录"
        message="登录后才可以购买商品"
      />
    </div>
  );
};

export default ProductDetail;
