import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { deletePost, getPosts, updatePost, createPost, getUserProfile, checkUserLike,addLike, removeLike, ensureUserProfile } from '@/integrations/supabase/client';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { Heart, MessageCircle, Filter, Search, X, Share2, Plus, LogIn, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CommentSection from '@/components/CommentSection';
import LoginPrompt from '@/components/LoginPrompt'; // 导入统一的登录提示组件

const Community = () => {
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 检查是否是当前用户发布的帖子
  const isOwnPost = (post) => {
    if (!user || !post.author_id) return false;
    return post.author_id === user.id;
  };

  // 删除帖子的 mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId) => {
      await deletePost(postId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["communityStories"]);
    },
    onError: (error) => {
      console.error("删除帖子失败:", error);
      alert("删除失败，请重试");
    }
  });

  // 处理删除帖子
  const handleDeletePost = (postId, e) => {
    if (e) e.stopPropagation();

    if (confirm("确定要删除这个帖子吗？此操作不可撤销。")) {
      deleteMutation.mutate(postId);
    }
  };

  // 查询用户点赞状态
  const { data: userLikes } = useQuery({
    queryKey: ["userLikes", user?.id],
    queryFn: async () => {
      if (!user) return new Set();

      try {
        // 获取用户所有点赞的帖子ID
        const { data: likes, error } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        if (error) throw error;

        // 返回帖子ID的Set，便于快速查找
        return new Set(likes.map(like => like.post_id));
      } catch (error) {
        console.error('获取用户点赞列表失败:', error);
        return new Set();
      }
    },
    enabled: !!user // 只有登录用户才查询
  });

  // 检查用户是否点赞了某个帖子
  const isPostLiked = (postId) => {
    return userLikes ? userLikes.has(postId) : false;
  };

  // 替换原来的 likeMutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, currentLikes, isLiked }) => {
      if (isLiked) {
        // 取消点赞：likes - 1
        await updatePost({
          id: postId,
          likes: Math.max(0, (currentLikes || 0) - 1),
          updated_at: new Date().toISOString()
        });
        await removeLike(user.id, postId);
      } else {
        // 添加点赞：likes + 1
        await updatePost({
          id: postId,
          likes: (currentLikes || 0) + 1,
          updated_at: new Date().toISOString()
        });
        await addLike(user.id, postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["communityStories"]);
      queryClient.invalidateQueries(["userLikes"]); // 刷新点赞状态
    },
    onError: (error) => {
      console.error("点赞操作失败:", error);
      alert("操作失败，请重试");
    }
  });

  // 修改 handleLike 函数使用统一提示
  const handleLike = (story, e) => {
    if (e) e.stopPropagation();

    if (showLoginPromptIfNeeded()) return;
    const isLiked = isPostLiked(story.id);

    likeMutation.mutate({
      postId: story.id,
      currentLikes: story.likes,
      isLiked: isLiked
    });
  };

  // 修改 handleComment 函数使用统一提示
  const handleComment = (story, e) => {
    if (e) e.stopPropagation();

    if (showLoginPromptIfNeeded()) return;

    // 添加这3行调试代码
    console.log('=== handleComment 调试 ===');
    console.log('story 对象:', story);
    console.log('story.id:', story?.id);

    // 确保传递正确的 post 对象
    setSelectedPostForComments(story);
    setShowComments(true);
  };

  // 处理图片选择
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 移除选中的图片
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    const fileInput = document.getElementById('story-image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // 处理发布按钮点击
  const handlePublishButtonClick = () => {
    if (showLoginPromptIfNeeded()) return;
    setShowPublishModal(true);
  };

  // 处理表单提交
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get("title")?.toString().trim();
    const content = formData.get("content")?.toString().trim();
    const tags = formData.get("tags")?.toString().split(",").map((tag) => tag.trim()).filter(tag => tag) || [];

    if (!title || !content) {
      alert("请填写标题和内容");
      return;
    }

    try {
      await publishMutation.mutateAsync({
        title,
        content,
        tags,
        image: imagePreview
      });

      e.target.reset();
    } catch (error) {
      console.error("发布失败:", error);
    }
  };

  // 处理登录跳转
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/auth');
  };

  // 统一的登录提示处理函数
  const showLoginPromptIfNeeded = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return true;
    }
    return false;
  };

  // 从 Supabase 获取社区内容数据
  const { data: stories, isLoading } = useQuery({
    queryKey: ["communityStories", searchQuery, activeFilter],
    queryFn: async () => {
      try {
        const posts = await getPosts();
        
        // 转换数据格式
        let formattedPosts = posts.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.author || "匿名用户",
          author_id: post.author_id, // 使用author_id字段
          avatar: post.avatar || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32",
          date: formatTimeAgo(post.created_at),
          image: post.image ||  "https://nocode.meituan.com/photo/search?keyword=story,creative&width=400&height=200",
          likes: post.likes || 0,
          comments: post.comments || 0,
          tags: post.tags || [],
          created_at: post.created_at
        })).filter(post => post.title && post.content);

        // 搜索过滤
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          formattedPosts = formattedPosts.filter(post =>
            post.title.toLowerCase().includes(query) ||
            post.content.toLowerCase().includes(query) ||
            post.author.toLowerCase().includes(query) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
          );
        }

        // 根据筛选条件排序
        if (activeFilter === "popular") {
          // 最热：按点赞数降序
          formattedPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (activeFilter === "latest") {
          // 最新：按创建时间降序（默认）
          formattedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        // "all" 和 "following" 保持默认排序（最新）

        return formattedPosts;
      } catch (error) {
        console.error("获取社区内容失败:", error);
        throw error;
      }
    },
  });

  // 发布帖子的 mutation
  const publishMutation = useMutation({
    mutationFn: async (postData) => {
      if (!user) {
        throw new Error('用户未登录');
      }

      // 确保用户profile存在
      await ensureUserProfile(user);

      // 确保获取最新的用户信息
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('获取用户信息失败:', error);
        // 如果获取用户信息失败，使用用户元数据中的display_name
        throw error;
      }

      const newPost = {
        title: postData.title,
        content: postData.content,
        author: userProfile.display_name, // 使用最新的显示名称
        author_id: user.id, // 使用author_id字段而不是user_id
        avatar: userProfile.avatar_url || "https://nocode.meituan.com/photo/search?keyword=avatar&width=32&height=32", // 使用最新的头像
        tags: postData.tags,
        image: postData.image || "https://nocode.meituan.com/photo/search?keyword=story,creative&width=400&height=200",
        likes: 0,
        comments: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('发布帖子的数据:', newPost);
      const result = await createPost(newPost);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["communityStories"]);
      setShowPublishModal(false);
      setSelectedImage(null);
      setImagePreview(null);
      console.log("发布成功:", data);
    },
    onError: (error) => {
      console.error("发布帖子失败:", error);
      alert("发布失败，请重试: " + error.message);
    }
  });

  // 处理发布新故事
  const handlePublishStory = (storyData) => {
    publishMutation.mutate(storyData);
  };

  // 处理分享
  const handleShare = (storyId) => {
    console.log(`分享故事 ${storyId}`);
  };

  // 修改 handleViewPost 函数使用统一提示
  const handleViewPost = (post) => {
    if (showLoginPromptIfNeeded()) return;
    setSelectedPost(post);
  };

  // 关闭帖文详情模态框
  const handleClosePostDetail = () => {
    setSelectedPost(null);
  };

  // 时间格式化函数
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "刚刚";
    
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - postTime) / 1000);
    
    if (diffInSeconds < 60) return "刚刚";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  // 过滤选项
  const filterOptions = [
    { id: "all", label: "全部" },
    { id: "latest", label: "最新" },
    { id: "popular", label: "最热" },
    { id: "following", label: "关注" },
  ];

  return (
    <div className="min-h-screen bg-[#f9f7f3]">
      <Header />
      
      <div className="container py-8">
        <motion.h1 
          className="text-3xl font-light mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          共创故事集 - 社区
        </motion.h1>
        
        {/* 搜索和筛选栏 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#999]" />
            <Input
              type="text"
              placeholder="搜索故事、作者、标签..."
              className="pl-10 pr-4 rounded-full border-[#e8e3db] bg-[#f9f7f3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filterOptions.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "outline"}
                className={`rounded-full ${
                  activeFilter === filter.id
                    ? "bg-[#d4a373] text-white"
                    : "bg-[#f9f7f3] text-[#666] hover:bg-[#e8e3db]"
                }`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* 发布按钮 */}
        <div className="mb-6 flex justify-end">
          <Button
            className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full px-6"
            onClick={handlePublishButtonClick}
            disabled={publishMutation.isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {publishMutation.isLoading ? "发布中..." : "发布故事"}
          </Button>
        </div>
        
        {/* 故事列表 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-[#e8e3db] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories?.map((story, index) => (
              <motion.div
                key={story.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => handleViewPost(story)}
              >
                <div className="p-4">
                  <div className="flex items-center mb-3">
                    <img
                      src={story.avatar}
                      alt={story.author}
                      className="h-8 w-8 rounded-full object-cover mr-2"
                    />
                    <div>
                      <p className="text-sm font-medium">{story.author}</p>
                      <p className="text-xs text-[#999]">{story.date}</p>
                    </div>
                  </div>
                  <h3 className="font-medium text-[#333] mb-2">{story.title}</h3>
                  <p className="text-sm text-[#666] mb-3 line-clamp-2">{story.content}</p>
                  {story.image && (
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-48 rounded-lg object-cover mb-3"
                    />
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {story.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-[#e8e3db] text-[#666] text-xs px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        className={`flex items-center transition-colors ${
                          isPostLiked(story.id)
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-[#999] hover:text-[#d4a373]'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();  // 阻止冒泡
                          handleLike(story, e); // 传递 story 和 e
                        }}
                        disabled={likeMutation.isLoading}
                      >
                        <Heart
                          className={`h-4 w-4 ${isPostLiked(story.id) ? 'fill-current' : ''}`}
                        />
                        <span className="ml-1 text-xs">{story.likes}</span>
                      </button>
                      <button
                        className="flex items-center text-[#999] hover:text-[#d4a373] transition-colors"
                        onClick={() => handleComment(story)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="ml-1 text-xs">{story.comments}</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* 删除按钮 - 只对当前用户发布的帖子显示 */}
                      {isOwnPost(story) && (
                        <button
                          className="text-[#999] hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(story.id, e);
                          }}
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="text-[#999] hover:text-[#d4a373] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(story.id);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* 使用统一的登录提示组件 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginRedirect}
        title="请先登录"
        message="登录后才可以发布精彩故事"
      />

      {/* 发布模态框 */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-medium mb-4">发布新故事</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#333] mb-2">标题</label>
                <Input
                  name="title"
                  className="rounded-lg border-[#e8e3db] bg-[#f9f7f3"
                  placeholder="请输入故事标题"
                  required
                  disabled={publishMutation.isLoading}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#333] mb-2">内容</label>
                <textarea
                  name="content"
                  rows="4"
                  className="w-full rounded-lg border border-[#e8e3db] bg-[#f9f7f3] p-3 text-sm resize-none"
                  placeholder="分享您的故事..."
                  required
                  disabled={publishMutation.isLoading}
                ></textarea>
              </div>
              
              {/* 图片上传区域 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#333] mb-2">故事图片（选填）</label>

                {imagePreview ? (
                  <div className="relative mb-3">
                    <img
                      src={imagePreview}
                      alt="预览图片"
                      className="w-full h-48 rounded-lg object-cover border border-[#e8e3db]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="story-image"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#e8e3db] rounded-lg bg-[#f9f7f3] hover:bg-[#e8e3db] transition-colors cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-[#999] mb-2" />
                    <p className="text-sm text-[#666] text-center">
                      <span className="text-[#d4a373] font-medium">点击上传图片</span><br />
                      <span className="text-xs">或拖拽图片到这里</span>
                    </p>
                    <p className="text-xs text-[#999] mt-1">支持 JPG, PNG, GIF，最大5MB</p>
                  </label>
                )}

                <input
                  id="story-image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={publishMutation.isLoading}
                />

                {!imagePreview && (
                  <p className="text-xs text-[#999] mt-1">
                    上传图片可以让您的故事更加生动（可选）
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#333] mb-2">标签</label>
                <Input
                  name="tags"
                  placeholder="多个标签用逗号分隔，例如：胡同,手工艺品,发现"
                  className="rounded-lg border-[#e8e3db] bg-[#f9f7f3"
                  disabled={publishMutation.isLoading}
                />
                <p className="text-xs text-[#999] mt-1">用逗号分隔多个标签</p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setShowPublishModal(false);
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  disabled={publishMutation.isLoading}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
                  disabled={publishMutation.isLoading}
                >
                  {publishMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      发布中...
                    </>
                  ) : (
                    "发布"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 帖文详情模态框 - 仅在用户已登录时显示 */}
      {isAuthenticated && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 头部信息 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <img
                    src={selectedPost.avatar}
                    alt={selectedPost.author}
                    className="h-12 w-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="font-medium text-[#333]">{selectedPost.author}</p>
                    <p className="text-sm text-[#999]">{selectedPost.date}</p>
                  </div>
                </div>
                <button
                  onClick={handleClosePostDetail}
                  className="p-2 rounded-full hover:bg-[#e8e3db] transition-colors"
                >
                  <X className="h-5 w-5 text-[#666]" />
                </button>
              </div>
              
              {/* 标题 */}
              <h2 className="text-2xl font-medium text-[#333] mb-4">{selectedPost.title}</h2>
              
              {/* 内容 */}
              <div className="text-[#666] mb-6 whitespace-pre-wrap">
                {selectedPost.content}
              </div>
              
              {/* 图片 */}
              {selectedPost.image && (
                <div className="mb-6">
                  <img
                    src={selectedPost.image}
                    alt={selectedPost.title}
                    className="w-full rounded-lg object-cover"
                  />
                </div>
              )}
              
              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedPost.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-[#e8e3db] text-[#666] text-sm px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              
              {/* 互动区域 */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e8e3db]">
                <div className="flex items-center space-x-6">
                  <button
                    className={`flex items-center transition-colors ${
                      isPostLiked(selectedPost.id)
                        ? 'text-red-500 hover:text-red-600'
                        : 'text-[#999] hover:text-[#d4a373]'
                    }`}
                    onClick={() => handleLike(selectedPost)}  // 这里不需要 e，因为没有冒泡问题
                    disabled={likeMutation.isLoading}
                  >
                    <Heart
                      className={`h-5 w-5 ${isPostLiked(selectedPost.id) ? 'fill-current' : ''}`}
                    />
                    <span className="ml-2">{selectedPost.likes}</span>
                  </button>
                  <button
                    className="flex items-center text-[#999] hover:text-[#d4a373] transition-colors"
                    onClick={() => handleComment(selectedPost)}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="ml-2">{selectedPost.comments}</span>
                  </button>
                </div>
                <button
                  className="text-[#999] hover:text-[#d4a373] transition-colors"
                  onClick={() => handleShare(selectedPost.id)}
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评论模态框 */}
      {showComments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 模态框头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">评论</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="p-2 rounded-full hover:bg-[#e8e3db] transition-colors"
                >
                  <X className="h-5 w-5 text-[#666]" />
                </button>
              </div>

              {/* 修改这一行 - 添加调试和确保传递 id */}
              {console.log('selectedPostForComments:', selectedPostForComments)}
              {selectedPostForComments && (
                <CommentSection 
                  postId={selectedPostForComments.id}  // 确保使用 .id
                  onClose={() => setShowComments(false)} 
                />
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
