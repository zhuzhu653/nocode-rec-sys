import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AvatarCropper from './AvatarCropper';

const AvatarUpload = ({ user, onAvatarUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const queryClient = useQueryClient();

  // 测试 Storage 配置
  const testStorage = async () => {
    try {
      console.log('开始测试 Storage 配置...');

      // 测试列出存储桶
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('列出存储桶失败:', bucketsError);
        return false;
      }

      console.log('可用存储桶:', buckets);

      // 检查 user-avatars 存储桶是否存在
      const userAvatarsBucket = buckets.find(bucket => bucket.name === 'user-avatars');
      if (!userAvatarsBucket) {
        console.error('user-avatars 存储桶不存在');
        return false;
      }

      console.log('user-avatars 存储桶配置:', userAvatarsBucket);

      // 测试上传小文件
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = '这是一个测试文件';
      const testFile = new Blob([testContent], { type: 'text/plain' });

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(testFileName, testFile, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('测试上传失败:', uploadError);
        return false;
      }

      console.log('测试文件上传成功');

      // 测试获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(testFileName);

      console.log('测试文件公开 URL:', publicUrl);

      // 测试删除文件
      const { error: deleteError } = await supabase.storage
        .from('user-avatars')
        .remove([testFileName]);

      if (deleteError) {
        console.error('测试删除失败:', deleteError);
        return false;
      }

      console.log('测试文件删除成功');

      return true;

    } catch (error) {
      console.error('Storage 测试过程中出错:', error);
      return false;
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 读取文件并显示裁剪界面
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedImageDataUrl) => {
    setShowCropper(false);
    setImagePreview(croppedImageDataUrl);

    // 将 Data URL 转换为 Blob
    const response = await fetch(croppedImageDataUrl);
    const blob = await response.blob();

    // 上传裁剪后的图片
    await uploadAvatar(blob);
  };

  const uploadAvatar = async (fileBlob) => {
    setIsUploading(true);
    try {
      // 生成唯一文件名
      const fileName = `${user.id}/avatar.jpg`; // 统一使用jpg格式
      const filePath = `avatars/${fileName}`;

      console.log('开始上传裁剪后的头像');

      // 上传文件到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, fileBlob, {
          upsert: true,
          cacheControl: '3600',
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('上传错误:', uploadError);
        throw uploadError;
      }

      // 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      console.log('头像上传成功，URL:', publicUrl);

      // 更新用户 profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 更新 auth 用户元数据
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (authError) throw authError;

      // 清理缓存
      queryClient.invalidateQueries(["communityStories"]);

      onAvatarUpdate(publicUrl);
      alert('头像上传成功！');

    } catch (error) {
      console.error('上传头像失败:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const removePreview = () => {
    setImagePreview(null);
    setOriginalImage(null);
  };

  // 删除头像
  const handleDeleteAvatar = async () => {
    try {
      setIsUploading(true);

      // 设置默认头像
      const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

      // 更新 profiles 表
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: defaultAvatar,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // 更新用户元数据
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: defaultAvatar }
      });

      if (authError) throw authError;

      onAvatarUpdate(defaultAvatar);
      setImagePreview(null);
      alert('头像已重置为默认头像');
    } catch (error) {
      console.error('删除头像失败:', error);
      alert('删除头像失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 当前头像预览 */}
      <div className="relative">
        <img
          src={imagePreview || user.user_metadata?.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32"}
          alt="用户头像"
          className="h-24 w-24 rounded-full object-cover border-2 border-[#e8e3db]"
        />
        {imagePreview && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
            <Crop className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* 上传和删除按钮 */}
      <div className="flex gap-2">
        <label
          htmlFor="avatar-upload"
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a373] text-white rounded-lg hover:bg-[#c99a67] cursor-pointer transition-colors"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? '上传中...' : '更换头像'}
        </label>

        <Button
          variant="outline"
          onClick={handleDeleteAvatar}
          disabled={isUploading}
          className="text-red-500 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          删除头像
        </Button>
      </div>

      {/* 预览操作 */}
      {imagePreview && !isUploading && (
        <Button
          variant="outline"
          onClick={removePreview}
          className="text-red-500 border-red-200 hover:bg-red-50"
        >
          重新选择
        </Button>
      )}

      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        disabled={isUploading}
        className="hidden"
      />

      <p className="text-xs text-[#999] text-center">
        支持 JPG, PNG, GIF 格式<br />
        最大 5MB，自动裁剪为正方形
      </p>

      {/* 测试按钮 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const isWorking = await testStorage();
            alert(isWorking ? 'Storage 配置正常' : 'Storage 配置有问题');
          }}
        >
          测试 Storage
        </Button>
      )}

      {/* 裁剪模态框 */}
      {showCropper && originalImage && (
        <AvatarCropper
          imageSrc={originalImage}
          onCancel={() => setShowCropper(false)}
          onSave={handleCroppedImage}
        />
      )}
    </div>
  );
};

export default AvatarUpload;
