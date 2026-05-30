import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Upload, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AvatarUpload from '@/components/AvatarUpload';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // 在 useEffect 中设置 displayName 和 bio
  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('display_name, bio')
          .eq('id', user.id)
          .single();

        let userName = '';
        let userBio = '';

        if (!error && profile) {
          userName = profile.display_name || '';
          userBio = profile.bio || '';
        } else {
          userName = user.user_metadata?.display_name || user.email?.split('@')[0] || '用户';
        }

        setDisplayName(userName);
        setBio(userBio);

      } catch (error) {
        console.error('加载用户信息失败:', error);
        const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || '用户';
        setDisplayName(fallbackName);
        setBio('');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // 更新 auth.users 中的用户元数据
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (authError) throw authError;

      // 更新 profiles 表
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setMessage('个人信息更新成功！');
      setTimeout(() => setMessage(''), 3000);

      // 调试：确认保存后状态值
      console.log('保存成功后的状态:', { displayName, bio });
    } catch (error) {
      console.error('更新个人信息失败:', error);
      setMessage('更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl) => {
    setMessage('头像更新成功！');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleBack = () => {
    navigate(-1); // 返回上一页
  };

  if (!user) {
    return <div>请先登录</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a373] mx-auto mb-4"></div>
            <p className="text-[#666]">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {/* 返回按钮移到右上角 */}
      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2 text-[#666] hover:text-[#333] hover:bg-[#f9f7f3] border-[#e8e3db]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>

      <h1 className="text-3xl font-light mb-8">个人设置</h1>

      <div className="space-y-6">
        {/* 头像设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              头像设置
            </CardTitle>
            <CardDescription>上传你的个性化头像</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload user={user} onAvatarUpdate={handleAvatarUpdate} />
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>管理你的个人信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">邮箱</label>
              <Input value={user.email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">邮箱地址不可修改</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">显示名称</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={displayName || "请输入你的显示名称"}
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                这将是你在社区中显示的名称 ({displayName.length}/20)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">个人简介</label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="请输入你的个人简介"
              />
              <p className="text-xs text-gray-500 mt-1">
                这将是你在社区中显示的简介 ({bio.length}/100)
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving || !displayName.trim()}
              className="bg-[#d4a373] hover:bg-[#c99a67]"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存更改'}
            </Button>

            {message && (
              <div className={`p-3 rounded-lg ${
                message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
