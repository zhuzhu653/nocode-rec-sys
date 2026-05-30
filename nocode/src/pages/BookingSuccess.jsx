import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWorkshopById, getUserWorkshopBookings } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BookingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const bookingId = searchParams.get("bookingId");
  const workshopId = searchParams.get("workshopId");
  const userName = searchParams.get("name");
  const userPhone = searchParams.get("phone");

  // 从数据库获取工作坊详情数据
  const { data: workshop, isLoading: workshopLoading, error: workshopError } = useQuery({
    queryKey: ["workshopDetail", workshopId],
    queryFn: async () => {
      if (!workshopId) throw new Error("工作坊ID不能为空");
      return await getWorkshopById(workshopId);
    },
    enabled: !!workshopId, // 只有有workshopId时才执行
  });

  // 从数据库获取用户预约记录
  const { data: userBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["userBookings", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("用户未登录");
      return await getUserWorkshopBookings(user.id);
    },
    enabled: !!user, // 只有用户登录时才执行
  });

  // 找到当前预约的详细信息
  const currentBooking = userBookings?.find(booking => booking.id === bookingId);

  const isLoading = workshopLoading || bookingsLoading;
  const hasError = workshopError || !workshop;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f7f3] flex items-center justify-center py-8">
        <div className="container max-w-md">
          <div className="h-64 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#f9f7f3] flex items-center justify-center py-8">
        <div className="container max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">预约信息加载失败</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-[#666] mb-4">无法获取预约详情，请返回重试。</p>
              <Button
                className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white"
                onClick={() => navigate(-1)}
              >
                返回
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f3] flex items-center justify-center py-8">
      <div className="container max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">预约成功！</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-[#666]">
              您已成功预约"{workshop.title}"，我们已将预约详情发送至您的手机。
            </p>
            
            <div className="bg-[#f9f7f3] rounded-lg p-4 text-left">
              <h3 className="font-medium mb-2">预约详情</h3>
              <div className="space-y-1 text-sm text-[#666]">
                <p>预约编号: {currentBooking?.id || bookingId}</p>
                <p>课程：{workshop.title}</p>
                <p>时间：{workshop.open_date} {workshop.duration}</p>
                <p>地点：{workshop.location}</p>
                <p>价格：¥{workshop.price}</p>
                <p>状态：{currentBooking?.status === 'pending_payment' ? '待支付' : '已确认'}</p>
                <p>联系人：{userName} {userPhone}</p>
                {workshop.instructors?.name && (
                  <p>讲师：{workshop.instructors.name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white"
                onClick={() => navigate("/user-center-true")}
              >
                查看预约记录
              </Button>
              <Button 
                variant="outline"
                className="w-full border-[#e8e3db] text-[#666]"
                onClick={() => navigate("/experience")}
              >
                返回工作坊
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingSuccess;