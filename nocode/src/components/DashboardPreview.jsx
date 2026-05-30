import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Wallet, Users } from 'lucide-react';

const DashboardPreview = () => {
  // 模拟数据
  const stats = [
    { title: "总浏览量", value: "1,248", icon: <BarChart3 className="h-5 w-5" />, change: "+12%" },
    { title: "总转化率", value: "8.2%", icon: <TrendingUp className="h-5 w-5" />, change: "+2.1%" },
    { title: "总收入", value: "¥24,560", icon: <Wallet className="h-5 w-5" />, change: "+18%" },
    { title: "新增用户", value: "142", icon: <Users className="h-5 w-5" />, change: "+5.3%" }
  ];

  const chartData = [
    { name: "周一", views: 120, bookings: 8 },
    { name: "周二", views: 190, bookings: 12 },
    { name: "周三", views: 150, bookings: 10 },
    { name: "周四", views: 220, bookings: 15 },
    { name: "周五", views: 280, bookings: 22 },
    { name: "周六", views: 320, bookings: 28 },
    { name: "周日", views: 260, bookings: 20 }
  ];

  const pieData = [
    { name: '陶艺体验', value: 45 },
    { name: '水彩课程', value: 30 },
    { name: '木工工作坊', value: 25 }
  ];

  const COLORS = ['#d4a373', '#e8e3db', '#f9f7f3'];

  return (
    <div className="space-y-6 bg-[#f9f7f3] -mx-6 -my-6 p-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666]">{stat.title}</p>
                  <h3 className="text-xl font-medium text-[#333] mt-1">{stat.value}</h3>
                </div>
                <div className="p-2 bg-[#d4a373]/10 rounded-full text-[#d4a373]">
                  {stat.icon}
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stat.change} 与上周相比
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 浏览量和预约量趋势图 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">本周数据趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3db" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f9f7f3', 
                    borderColor: '#e8e3db', 
                    borderRadius: '0.5rem' 
                  }} 
                />
                <Bar dataKey="views" name="浏览量" fill="#d4a373" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookings" name="预约量" fill="#e8e3db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 课程类型分布饼图 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">课程类型分布</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f9f7f3', 
                    borderColor: '#e8e3db', 
                    borderRadius: '0.5rem' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 数据说明 */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-[#d4a373] mx-auto mb-4" />
            <h3 className="text-xl font-medium text-[#333] mb-2">数据看板预览版</h3>
            <p className="text-[#666] mb-4">
              这是达人数据中心的预览版本，完整版将包含更多详细数据和分析功能。
            </p>
            <div className="bg-[#e8e3db] rounded-lg p-4 text-left max-w-2xl mx-auto">
              <h4 className="font-medium text-[#333] mb-2">完整版功能预览：</h4>
              <ul className="text-sm text-[#666] space-y-1">
                <li>• 实时数据监控与分析</li>
                <li>• 用户行为深度洞察</li>
                <li>• 收入与转化率详细报告</li>
                <li>• 个性化数据可视化</li>
                <li>• 导出数据报告功能</li>
              </ul>
            </div>
            <p className="text-[#999] text-sm mt-4">
              完整版数据看板需付费使用，详情请咨询：NoCodewithICCI.163.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPreview;
