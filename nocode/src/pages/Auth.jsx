import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, QrCode, Eye, EyeOff, ArrowLeft } from "lucide-react";
import VerificationSignup from "@/components/VerificationSignup";

const Auth = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password"); // password or code
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 处理返回上一页
  const handleGoBack = () => {
    navigate(-1); // 返回上一页
  };

  // 登录表单状态
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    code: ""
  });

  // 处理注册成功
  const handleRegisterSuccess = () => {
    // 注册成功后切换到登录标签页
    setActiveTab("login");
    // 显示成功消息
    alert("注册成功！请检查您的邮箱完成验证，然后登录。");
  };

  // 处理注册错误
  const handleRegisterError = (error) => {
    console.error("注册失败:", error);
    alert("注册失败: " + error.message);
  };

  // 处理登录表单输入
  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  // 处理密码登录提交
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      alert("请输入邮箱和密码");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("开始密码登录...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      
      if (error) {
        console.error("登录错误:", error);
        
        // 检查是否是用户不存在错误
        if (error.message.includes("Invalid login credentials")) {
          // 提示用户注册
          if (confirm("账户不存在，是否立即注册？")) {
            setActiveTab("register");
            // 预填充邮箱
            setLoginData(prev => ({ ...prev, email: loginData.email }));
          }
          return;
        }
        
        throw error;
      }
      
      console.log("登录成功:", data);
      // 登录成功后跳转到首页
      navigate("/");
      
    } catch (error) {
      console.error("登录失败:", error);
      alert("登录失败: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理验证码登录提交
  const handleCodeLogin = async (e) => {
    e.preventDefault();
    
    if (!loginData.email) {
      alert("请输入邮箱地址");
      return;
    }
    
    if (!loginData.code) {
      alert("请输入验证码");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("开始验证码登录...");
      const { data, error } = await supabase.auth.verifyOtp({
        email: loginData.email,
        token: loginData.code,
        type: 'email',
      });
      
      if (error) {
        console.error("验证码登录错误:", error);
        throw error;
      }
      
      console.log("验证码登录成功:", data);
      // 登录成功后跳转到首页
      navigate("/");
      
    } catch (error) {
      console.error("验证码登录失败:", error);
      alert("登录失败: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    if (!loginData.email) {
      alert("请输入邮箱地址");
      return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      alert("请输入有效的邮箱地址");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("发送验证码到:", loginData.email);
      const { data, error } = await supabase.auth.signInWithOtp({
        email: loginData.email,
        options: {
          shouldCreateUser: false,
        }
      });
      
      if (error) {
        console.error("发送验证码错误:", error);
        throw error;
      }
      
      console.log("验证码发送成功:", data);
      alert("验证码已发送至您的邮箱，请查收");
      
    } catch (error) {
      console.error("发送验证码失败:", error);
      
      // 检查是否是用户不存在错误
      if (error.message.includes("user not found")) {
        if (confirm("该邮箱未注册，是否立即注册？")) {
          setActiveTab("register");
        }
        return;
      }
      
      alert("发送失败: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理社交登录（示例）
  const handleSocialLogin = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error(`${provider}登录失败:`, error);
      alert(`${provider}登录失败: ` + error.message);
    }
  };

  // 重置表单
  const resetLoginForm = () => {
    setLoginData({
      email: "",
      password: "",
      code: ""
    });
  };

  // 切换密码显示
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f3] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg relative">
        {/* 返回按钮 */}
        <button
          onClick={handleGoBack}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#e8e3db] transition-colors text-[#666] hover:text-[#333] z-10 flex items-center space-x-1"
          aria-label="返回上一页"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm hidden sm:inline">返回上一页</span>
        </button>

        <CardHeader className="text-center space-y-2 pt-12">
          <CardTitle className="text-3xl font-light text-[#333]">欢迎来到循踪觅意</CardTitle>
          <CardDescription className="text-[#666]">
            发现城市美好，分享生活灵感
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            resetLoginForm();
          }} className="w-full">
            
            <TabsList className="grid w-full grid-cols-2 bg-[#e8e3db] p-1 rounded-lg">
              <TabsTrigger 
                value="login" 
                className="rounded-md data-[state=active]:bg-[#d4a373] data-[state=active]:text-white transition-colors"
              >
                登录
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-md data-[state=active]:bg-[#d4a373] data-[state=active]:text-white transition-colors"
              >
                注册
              </TabsTrigger>
            </TabsList>
            
            {/* 登录标签页 */}
            <TabsContent value="login" className="space-y-6 mt-6">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-[#333]">欢迎回来</h3>
                <p className="text-sm text-[#666]">登录您的账户继续探索</p>
              </div>

              {loginMethod === "password" ? (
                // 密码登录表单
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="login-email" className="text-[#333] font-medium">邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        className="pl-10 pr-4 h-11 rounded-lg border-[#e8e3db] bg-white focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="login-password" className="text-[#333] font-medium">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入密码"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        className="pl-10 pr-10 h-11 rounded-lg border-[#e8e3db] bg-white focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-3 text-[#999] hover:text-[#666]"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg font-medium transition-colors shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        登录中...
                      </div>
                    ) : (
                      "登录"
                    )}
                  </Button>
                </form>
              ) : (
                // 验证码登录表单
                <form onSubmit={handleCodeLogin} className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="code-email" className="text-[#333] font-medium">邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                      <Input
                        id="code-email"
                        name="email"
                        type="email"
                        placeholder="请输入您的邮箱"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        className="pl-10 pr-4 h-11 rounded-lg border-[#e8e3db] bg-white focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="login-code" className="text-[#333] font-medium">验证码</Label>
                    <div className="flex space-x-3">
                      <div className="relative flex-1">
                        <QrCode className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
                        <Input
                          id="login-code"
                          name="code"
                          type="text"
                          placeholder="请输入6位验证码"
                          value={loginData.code}
                          onChange={handleLoginChange}
                          className="pl-10 pr-4 h-11 rounded-lg border-[#e8e3db] bg-white focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                          required
                          maxLength={6}
                          disabled={isLoading}
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={sendVerificationCode} 
                        variant="outline"
                        className="h-11 px-4 border-[#e8e3db] text-[#666] hover:bg-[#e8e3db] whitespace-nowrap"
                        disabled={isLoading}
                      >
                        {isLoading ? "发送中..." : "发送验证码"}
                      </Button>
                    </div>
                    <p className="text-xs text-[#999]">验证码将发送到您的邮箱</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-lg font-medium transition-colors shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        验证中...
                      </div>
                    ) : (
                      "验证登录"
                    )}
                  </Button>
                </form>
              )}

              {/* 登录方式切换 */}
              <div className="flex justify-center pt-2">
                <Button 
                  variant="link" 
                  className="text-[#666] hover:text-[#d4a373] text-sm font-normal"
                  onClick={() => {
                    setLoginMethod(loginMethod === "password" ? "code" : "password");
                    resetLoginForm();
                  }}
                  disabled={isLoading}
                >
                  {loginMethod === "password" ? "使用邮箱验证码登录" : "使用密码登录"}
                </Button>
              </div>

              {/* 分隔线 */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#e8e3db]"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#f9f7f3] px-3 text-[#999]">其他登录方式</span>
                </div>
              </div>

              {/* 社交登录按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-[#e8e3db] text-[#666] hover:bg-[#e8e3db] hover:text-[#333]"
                  onClick={() => handleSocialLogin('wechat')}
                  disabled
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">微</div>
                    <span className="text-sm">微信</span>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-[#e8e3db] text-[#666] hover:bg-[#e8e3db] hover:text-[#333]"
                  onClick={() => handleSocialLogin('qq')}
                  disabled
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">Q</div>
                    <span className="text-sm">QQ</span>
                  </div>
                </Button>
              </div>

              {/* 注册提示 */}
              <div className="text-center pt-4 border-t border-[#e8e3db]">
                <p className="text-sm text-[#666] mb-3">还没有账户？</p>
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373] hover:text-white transition-colors"
                  onClick={() => setActiveTab("register")}
                  disabled={isLoading}
                >
                  立即注册
                </Button>
              </div>
            </TabsContent>
            
            {/* 注册标签页 */}
            <TabsContent value="register" className="mt-6">
              <VerificationSignup 
                onSuccess={handleRegisterSuccess}
                onError={handleRegisterError}
              />
              
              {/* 注册页面的登录提示 */}
              <div className="text-center pt-6 border-t border-[#e8e3db] mt-6">
                <p className="text-sm text-[#666] mb-3">已有账户？</p>
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373] hover:text-white transition-colors"
                  onClick={() => setActiveTab("login")}
                >
                  立即登录
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;