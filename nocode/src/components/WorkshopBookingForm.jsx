import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const WorkshopBookingForm = ({ workshop, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <span className="text-2xl font-medium text-[#d4a373]">¥{workshop.price}</span>
        <span className="text-sm text-[#666]">剩余 {workshop.remainingSeats} 席位</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#333] mb-2">姓名</label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="请输入您的姓名"
            className="rounded-lg border-[#e8e3db] bg-[#f9f7f3"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#333] mb-2">电话</label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="请输入您的电话"
            className="rounded-lg border-[#e8e3db] bg-[#f9f7f3"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#333] mb-2">备注</label>
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="有什么特殊需求或问题吗？"
            className="rounded-lg border-[#e8e3db] bg-[#f9f7f3"
            rows={3}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full py-6"
        >
          立即预约
        </Button>
      </form>
      
      <div className="mt-6 text-xs text-[#999] text-center">
        点击预约即表示您同意我们的服务条款和隐私政策
      </div>
    </div>
  );
};

export default WorkshopBookingForm;
