import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, MapPin, User, Phone, MessageCircle, CreditCard } from "lucide-react";
import { getWorkshopById, createWorkshopBookingWithValidation } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import LoginPrompt from "@/components/LoginPrompt"; // 导入统一的登录提示组件

const WorkshopBookingDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  
  // 添加登录提示状态
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 从数据库获取工作坊详情数据
  const { data: workshop, isLoading, error, refetch } = useQuery({
    queryKey: ["workshopDetail", id],
    queryFn: async () => {
      if (!id) throw new Error("工作坊ID不能为空");
      return await getWorkshopById(id);
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("wechat");
  const [errorMessage, setErrorMessage] = useState("");

  // 创建预约的mutation
  const createBookingMutation = useMutation({
    mutationFn: createWorkshopBookingWithValidation,
    onSuccess: (booking) => {
      // 预约创建成功，跳转到成功页面
      setErrorMessage("");
      navigate(`/booking-success?bookingId=${booking.id}&workshopId=${id}&name=${encodeURIComponent(formData.name)}&phone=${formData.phone}`);
    },
    onError: (error) => {
      console.error("预约创建失败:", error);

      if (error.message === 'DUPLICATE_BOOKING') {
        setErrorMessage(
          <div>
            <p>您已预约！请为其他小伙伴订购吧~</p>
            <p className="mt-2 text-sm">可以前往个人中心查看预约记录哦！</p>
            <button
              onClick={() => navigate('/user-center-true')}
              className="mt-3 bg-[#d4a373] text-white px-4 py-2 rounded-lg hover:bg-[#c99a67] transition-colors text-sm"
            >
              前往个人中心
            </button>
          </div>
        );
      } else if (error.message === 'WORKSHOP_FULL') {
        setErrorMessage("当前工作坊已满~看看其他的吧");
        // 刷新工作坊数据以获取最新的席位信息
        refetch();
      } else {
        setErrorMessage("预约失败，请重试");
      }
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 清空错误信息
    if (errorMessage) {
      setErrorMessage("");
    }
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
    navigate("/auth");
  };

  const handlePayment = async () => {
    if (showLoginPromptIfNeeded()) return;

    if (!workshop || !formData.name || !formData.phone) {
      return;
    }

    // 检查工作坊是否已满
    if (workshop.remaining_seats <= 0) {
      setErrorMessage("当前工作坊已满~看看其他的吧");
      return;
    }

    try {
      // 创建预约
      await createBookingMutation.mutateAsync({
        userId: user.id,
        workshopId: id,
        participantName: formData.name,
        participantPhone: formData.phone,
        notes: formData.notes,
        totalAmount: workshop.price
      });
    } catch (error) {
      // 错误处理已经在mutation的onError中处理
      console.error("支付处理失败:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3] py-8">
        <div className="container">
          <div className="h-80 rounded-2xl bg-[#e8e3db] animate-pulse mb-8"></div>
          <div className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9f7f3] py-8">
        <div className="container">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p className="font-bold">数据加载失败</p>
            <p>无法获取工作坊详情，请检查网络连接或联系管理员。</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-[#f9f7f3] py-8">
        <div className="container">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
            <p>未找到对应的工作坊</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3] py-8">
      <div className="container">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            ← 返回
          </Button>
          <h1 className="text-3xl font-light">课程预约</h1>
        </div>

        {/* 错误提示 */}
        {errorMessage && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧 - 课程信息 */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{workshop?.title}</span>
                  <span className="text-2xl font-medium text-[#d4a373]">¥{workshop?.price}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img
                      src={workshop?.image}
                      alt={workshop?.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  <div className="md:w-2/3">
                    <div className="space-y-4">
                      <div className="flex items-center text-[#666]">
                        <User className="h-4 w-4 mr-2 text-[#d4a373]" />
                        <span>{workshop?.instructors?.name}</span>
                      </div>
                      <div className="flex items-center text-[#666]">
                        <Calendar className="h-4 w-4 mr-2 text-[#d4a373]" />
                        <span>{workshop?.open_date} {workshop?.duration}</span>
                      </div>
                      <div className="flex items-center text-[#666]">
                        <MapPin className="h-4 w-4 mr-2 text-[#d4a373]" />
                        <span>{workshop?.location}</span>
                      </div>
                      <div className="text-[#666]">
                        <p>剩余席位: {workshop?.remaining_seats}/{workshop?.total_seats}</p>
                      </div>
                      <div className="text-[#666] text-sm">
                        <p>{workshop?.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 个人信息填写 */}
            <Card>
              <CardHeader>
                <CardTitle>个人信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名 *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="请输入您的姓名"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">电话 *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="请输入您的电话"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">备注</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="有什么特殊需求或问题吗？"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧 - 支付信息 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>支付信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-[#f9f7f3] rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#666]">课程费用</span>
                    <span>¥{workshop?.price}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[#666]">服务费</span>
                    <span>¥0</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-[#e8e3db] font-medium">
                    <span>总计</span>
                    <span className="text-[#d4a373]">¥{workshop?.price}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">支付方式</h3>
                  <div className="space-y-3">
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentMethod === "wechat" 
                          ? "border-[#d4a373] bg-[#d4a373]/10" 
                          : "border-[#e8e3db] hover:border-[#d4a373]/50"
                      }`}
                      onClick={() => setPaymentMethod("wechat")}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold mr-3">
                          微
                        </div>
                        <span>微信支付</span>
                      </div>
                    </div>
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentMethod === "alipay" 
                          ? "border-[#d4a373] bg-[#d4a373]/10" 
                          : "border-[#e8e3db] hover:border-[#d4a373]/50"
                      }`}
                      onClick={() => setPaymentMethod("alipay")}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-3">
                          支
                        </div>
                        <span>支付宝</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white py-6"
                  onClick={handlePayment}
                  disabled={
                    !formData.name ||
                    !formData.phone ||
                    createBookingMutation.isLoading ||
                    workshop.remaining_seats <= 0
                  }
                >
                  {workshop.remaining_seats <= 0 ? "已满员" : createBookingMutation.isLoading ? "处理中..." : "立即支付"}
                </Button>

                <div className="text-xs text-[#999] text-center">
                  点击支付即表示您同意我们的服务条款和隐私政策
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 使用统一的登录提示组件 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginRedirect}
        title="请先登录"
        message="登录后才可以预约课程"
      />
    </div>
  );
};

export default WorkshopBookingDetail;
