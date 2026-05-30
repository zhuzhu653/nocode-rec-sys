import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Trash2, Plus, Minus, ShoppingCart, CreditCard, Package, Clock, Check } from 'lucide-react';
import { getCartItems, getPurchasedItems, updateCartItemQuantity, removeFromCart, createOrder, checkProductPurchaseLimit } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cart'); // cart, pending, purchased
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set()); // 选中的商品ID

  useEffect(() => {
    if (user) {
      loadCartData();
    }
  }, [user]);

  const loadCartData = async () => {
    try {
      setLoading(true);
      const [cartData, purchasedData] = await Promise.all([
        getCartItems(user.id),
        getPurchasedItems(user.id)
      ]);
      setCartItems(cartData);
      setPurchasedItems(purchasedData);
      // 初始化时默认选中所有商品
      const initialSelected = new Set(cartData.map(item => item.id));
      setSelectedItems(initialSelected);
    } catch (error) {
      console.error('加载购物车数据错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换单个商品选中状态
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      // 如果已经全选，则取消全选
      setSelectedItems(new Set());
    } else {
      // 否则全选
      const allItemIds = new Set(cartItems.map(item => item.id));
      setSelectedItems(allItemIds);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      await updateCartItemQuantity(user.id, productId, newQuantity);
      // 只更新特定项目的数量，而不是重新加载整个购物车
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.product_id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      console.error('更新数量错误:', error);
    }
  };

  const removeItem = async (productId) => {
    try {
      await removeFromCart(user.id, productId);
      await loadCartData(); // 重新加载
    } catch (error) {
      console.error('移除商品错误:', error);
    }
  };

  const handleCheckout = async () => {
    if (selectedItems.size === 0) {
      alert('请至少选择一件商品进行结算');
      return;
    }

    // 检查选中的商品是否达到购买限额
    const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));

    for (const item of selectedCartItems) {
      const isLimitReached = await checkProductPurchaseLimit(user.id, item.product_id, item.quantity);
      if (isLimitReached) {
        alert('商品达到购买限额啦！看看别的吧~');
        return;
      }
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      // 只创建选中商品的订单
      const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));
      const order = await createOrder(user.id, selectedCartItems);
      console.log('订单创建成功:', order);

      // 重新加载数据
      await loadCartData();
      setActiveTab('purchased'); // 切换到已购买标签

    } catch (error) {
      console.error('订单创建错误:', error);
      if (error.message === '商品达到购买限额啦！看看别的吧~') {
        alert('商品达到购买限额啦！看看别的吧~');
      } else {
        alert('订单创建失败，请重试');
      }
    }
  };

  // 计算选中商品的总金额
  const selectedTotalAmount = cartItems
    .filter(item => selectedItems.has(item.id))
    .reduce((total, item) => {
      return total + (item.digital_products?.price || 0) * item.quantity;
    }, 0);

  // 计算选中商品的数量
  const selectedItemsCount = selectedItems.size;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f9f7f3]">
        <Header />
        <div className="container py-6 md:py-8">
          <div className="text-center">
            <p>请先登录</p>
            <button onClick={() => navigate('/auth')} className="mt-4 text-[#d4a373]">
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      <div className="container py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-light mb-8">我的购物车</h1>

        {/* 标签导航 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('cart')}
            className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
          >
            <ShoppingCart className="h-4 w-4 inline mr-2" />
            购物车 ({cartItems.length})
          </button>

          <button
            onClick={() => setActiveTab('purchased')}
            className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
          >
            <Package className="h-4 w-4 inline mr-2" />
            已购买 ({purchasedItems.length})
          </button>
        </div>

        {/* 购物车内容 */}
        {activeTab === 'cart' && (
          <>
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">购物车为空</p>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="bg-[#d4a373] text-white px-6 py-2 rounded-lg hover:bg-[#c99a67] transition-colors"
                >
                  去购物
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 商品列表 */}
                <div className="lg:col-span-2 space-y-4">
                  {/* 全选按钮 */}
                  <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                          onChange={toggleSelectAll}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 border-2 rounded ${
                          selectedItems.size === cartItems.length && cartItems.length > 0
                            ? 'bg-[#d4a373] border-[#d4a373]'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {selectedItems.size === cartItems.length && cartItems.length > 0 && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <span className="ml-2 text-sm font-medium">
                        全选 ({selectedItems.size}/{cartItems.length})
                      </span>
                    </label>
                  </div>

                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.product_id}`} className="bg-white rounded-xl p-4 flex items-center">
                      {/* 勾选框 */}
                      <label className="flex items-center cursor-pointer mr-4">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 border-2 rounded ${
                            selectedItems.has(item.id)
                              ? 'bg-[#d4a373] border-[#d4a373]'
                              : 'border-gray-300'
                          } flex items-center justify-center`}>
                            {selectedItems.has(item.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      </label>

                      <img
                        src={item.digital_products?.thumbnail_url}
                        alt={item.digital_products?.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                      />

                      <div className="flex-1">
                        <h3 className="font-medium">{item.digital_products?.name}</h3>
                        <p className="text-[#d4a373] font-bold">
                          ¥{item.digital_products?.price}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 mr-4 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 rounded-full border border-transparent hover:border-gray-300 hover:bg-gray-100 w-8 h-8 flex items-center justify-center transition-all duration-150"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 rounded-full border border-transparent hover:border-gray-300 hover:bg-gray-100 w-8 h-8 flex items-center justify-center transition-all duration-150"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="p-2 rounded-full border border-transparent hover:border-gray-300 text-gray-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center shrink-0"
                        title="移除商品"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 结算信息 */}
                <div className="bg-white rounded-xl p-6 h-fit">
                  <h2 className="text-xl font-light mb-4">订单摘要</h2>

                  <div className="space-y-2 mb-4">
                    {cartItems
                      .filter(item => selectedItems.has(item.id))
                      .map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.digital_products?.name} × {item.quantity}</span>
                          <span>¥{((item.digital_products?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="flex justify-between font-bold">
                      <span>总计</span>
                      <span className="text-[#d4a373]">¥{selectedTotalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={selectedItems.size === 0}
                    className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center ${
                      selectedItems.size === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#d4a373] text-white hover:bg-[#c99a67]'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {selectedItems.size === 0 ? '请选择商品' : `立即结算 (${selectedItemsCount})`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 已购买内容 */}
        {activeTab === 'purchased' && (
          <>
            {purchasedItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无购买记录</p>
                <button
                  onClick={() => navigate('/marketplace')}
                  className="bg-[#d4a373] text-white px-6 py-2 rounded-lg hover:bg-[#c99a67] transition-colors"
                >
                  去购物
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchasedItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4">
                    <img
                      src={item.digital_products?.thumbnail_url}
                      alt={item.digital_products?.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />

                    <h3 className="font-medium mb-2">{item.digital_products?.name}</h3>
                    <p className="text-[#d4a373] font-bold mb-2">
                      ¥{item.digital_products?.price}
                    </p>

                    <p className="text-sm text-gray-500">
                      购买时间: {new Date(item.purchased_at).toLocaleDateString()}
                    </p>

                    <button
                      onClick={() => navigate(`/product/${item.product_id}`)}
                      className="w-full mt-3 bg-[#e8e3db] hover:bg-[#d4a373] text-[#666] hover:text-white py-2 rounded-lg transition-colors"
                    >
                      查看详情
                    </button>

                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 支付模态框 */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={selectedTotalAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
};

export default Cart;
