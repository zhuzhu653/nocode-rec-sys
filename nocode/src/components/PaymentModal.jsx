import { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, totalAmount, onPaymentSuccess }) => {
  const [paymentStep, setPaymentStep] = useState('init'); // init, qrCode, success, error
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 虚拟支付处理
  const handleVirtualPayment = async () => {
    try {
      setIsProcessing(true);
      setPaymentStep('qrCode');
      
      // 模拟支付处理时间
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 直接进入支付成功状态
      setPaymentStep('success');
      
      // 2秒后自动关闭并触发成功回调
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('虚拟支付错误:', error);
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 手动验证支付（用户点击"我已付款"）
  const verifyPayment = async () => {
    try {
      setIsProcessing(true);

      // 模拟验证处理时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 虚拟支付成功
      setPaymentStep('success');

      // 2秒后自动关闭并触发成功回调
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('验证支付错误:', error);
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPayment = () => {
    setPaymentStep('init');
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-light">
            {paymentStep === 'init' && '确认支付'}
            {paymentStep === 'qrCode' && '虚拟支付'}
            {paymentStep === 'success' && '支付成功'}
            {paymentStep === 'error' && '支付失败'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 支付内容 */}
        <div className="text-center">
          {paymentStep === 'init' && (
            <>
              <div className="mb-6">
                <p className="text-2xl font-bold text-[#d4a373]">¥{totalAmount}</p>
                <p className="text-gray-500 mt-2">请确认支付金额</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessing}
                >
                  取消
                </button>
                <button
                  onClick={handleVirtualPayment}
                  className="flex-1 bg-[#d4a373] text-white py-2 rounded-lg hover:bg-[#c99a67] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={isProcessing}
                >
                  {isProcessing ? '处理中...' : '确认支付'}
                </button>
              </div>
            </>
          )}

          {paymentStep === 'qrCode' && (
            <>
              <div className="mb-4">
                <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center mx-auto mb-4 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">💰</div>
                  <p className="text-sm text-gray-500 text-center px-2">
                    虚拟支付演示
                  </p>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  这是虚拟支付演示，点击"我已付款"即可完成购买
                </p>
                <p className="text-xs text-gray-400 mb-2">支付金额：¥{totalAmount}</p>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">支付说明</p>
                  <p className="text-xs text-blue-600 mt-1">
                    点击下方按钮模拟支付成功，商品将自动转移到已购买页面
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetPayment}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessing}
                >
                  返回
                </button>
                <button
                  onClick={verifyPayment}
                  className="flex-1 bg-[#d4a373] text-white py-2 rounded-lg hover:bg-[#c99a67] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={isProcessing}
                >
                  {isProcessing ? '处理中...' : '我已付款'}
                </button>
              </div>
            </>
          )}

          {paymentStep === 'success' && (
            <div className="py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-800 font-medium text-lg mb-4">支付成功！</p>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700">
                  商品已成功购买，正在转移到已购买页面...
                </p>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">页面将在2秒后自动关闭</p>
            </div>
          )}

          {paymentStep === 'error' && (
            <>
              <div className="py-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-red-500 mb-2 font-medium">支付失败</p>
                <p className="text-sm text-gray-500 mb-4">请稍后重试</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetPayment}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新支付
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-[#d4a373] text-white py-2 rounded-lg hover:bg-[#c99a67] transition-colors"
                >
                  关闭
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;