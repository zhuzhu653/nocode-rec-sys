import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, QrCode, User } from "lucide-react";

const VerificationSignup = ({ onSuccess, onError }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState("signup"); // signup, verify
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 验证显示名称格式
  const validateDisplayName = (name) => {
    if (!name.trim()) {
      return "显示名称不能为空";
    }
    if (name.length < 2) {
      return "显示名称至少需要2个字符";
    }
    if (name.length > 20) {
      return "显示名称不能超过20个字符";
    }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\s]+$/.test(name)) {
      return "显示名称只能包含中文、英文、数字和下划线";
    }
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    
    // 验证显示名称
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setError(nameError);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    
    if (password.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("开始注册流程...");
      
      // 1. 创建用户账户
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim()
          }
        }
      });
      
      if (signupError) {
        console.error("注册错误:", signupError);
        throw signupError;
      }
      
      console.log("用户注册成功:", data);

      // 2. 在公共 profiles 表中创建用户档案
      if (data.user) {
        console.log("创建用户档案...");
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              display_name: displayName.trim(),
              email: email,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        
        if (profileError) {
          console.error("创建用户档案失败:", profileError);
          // 不抛出错误，因为用户账户已经创建成功
        } else {
          console.log("用户档案创建成功");
        }
      }
      
      // 3. 进入验证步骤
      console.log("切换到验证界面");
      setStep("verify");
      
    } catch (err) {
      console.error("注册过程错误:", err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      console.log("开始验证验证码...");
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email',
      });
      
      if (error) {
        console.error("验证错误:", error);
        throw error;
      }
      
      console.log("验证成功:", data);
      
      // 验证成功后调用成功回调
      if (onSuccess) {
        onSuccess();
      } else {
        // 默认行为：跳转到登录页
        navigate("/auth");
      }
      
    } catch (err) {
      console.error("验证过程错误:", err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const resendVerification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) throw error;
      
      alert("验证码已重新发送，请查收邮件");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-light">
          {step === "signup" ? "注册账户" : "验证邮箱"}
        </CardTitle>
        <CardDescription>
          {step === "signup" 
            ? "创建您的个性化账户" 
            : "我们已向您的邮箱发送了验证码，请查收"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* 显示名称字段 */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center">
                显示名称 <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="请输入您的显示名称（2-20个字符）"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
                  minLength={2}
                  maxLength={20}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-[#999]">
                这将是您在社区中显示的名称，支持中文、英文、数字
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                邮箱 <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入您的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                密码 <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center">
                确认密码 <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-600 text-sm font-medium">{error}</div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  注册中...
                </>
              ) : (
                "注册并发送验证码"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">验证码</Label>
              <div className="relative">
                <QrCode className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="请输入6位验证码"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="pl-10"
                  required
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-[#999]">
                验证码已发送至 {email}，请查收邮件
              </p>
              
              <Button 
                type="button"
                variant="link"
                className="p-0 h-auto text-xs"
                onClick={resendVerification}
                disabled={loading}
              >
                没有收到验证码？重新发送
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-600 text-sm font-medium">{error}</div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#d4a373] hover:bg-[#c99a67] text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  验证中...
                </>
              ) : (
                "完成注册"
              )}
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setStep("signup")}
              disabled={loading}
            >
              重新输入信息
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationSignup;