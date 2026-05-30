import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LoginPrompt = ({
  isOpen,
  onClose,
  onLogin,
  title = "请先登录",
  message = "登录后才可以继续操作"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#e8e3db] rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="h-8 w-8 text-[#d4a373]" />
          </div>
          <h2 className="text-xl font-medium text-[#333] mb-2">{title}</h2>
          <p className="text-[#666] text-sm">{message}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full h-11 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg font-medium"
            onClick={onLogin}
          >
            立即登录/注册
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 border-[#e8e3db] text-[#666] hover:bg-[#e8e3db] rounded-lg"
            onClick={onClose}
          >
            稍后再说
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
