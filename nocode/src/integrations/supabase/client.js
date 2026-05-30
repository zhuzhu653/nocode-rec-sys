import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://db0pq2tvjkuyx5.database.nocode.cn";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQ2OTc5MjAwLCJleHAiOjE5MDQ3NDU2MDB9.m5tgyL8EoPHnP8hAjpZKw5TJyIiM-uS7BMPbVWiKT0U";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase

// 定义 Post 类型（如果使用 TypeScript）
// interface Post {
//   id?: string;
//   title: string;
//   content: string;
//   created_at?: string;
// }


// 创建帖子
export const createPost = async (post) => {
  console.log("createPost 被调用，数据:", post); // 添加调试
  const { data, error } = await supabase.from('posts').insert([post]).select();
  if (error) {
    console.error('创建帖子错误:', error);
    throw error;
  }
  console.log("createPost 成功，返回数据:", data); // 添加调试
  return data;
} 


// 获取所有帖子
export const getPosts = async () => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false }); // 按创建时间倒序
  
  if (error) {
    console.error('获取帖子错误:', error);
    throw error;
  }
  return posts;
};

// 更新帖子
export const updatePost = async (post) => {
    const { error } = await supabase
        .from('posts')
        .update(post)
        .eq('id', post.id); 
    
    if (error) {
        console.error('更新帖子错误:', error);
        throw error;
    }
    return post;
}

// 删除帖子 - 添加用户权限验证
export const deletePost = async (postId, userId) => {
  // 首先验证用户是否有权限删除这个帖子
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();
    
  if (fetchError) {
    console.error('获取帖子信息错误:', fetchError);
    throw new Error('无法获取帖子信息');
  }

  // 检查用户是否是帖子的作者
  if (post.author_id !== userId) {
    throw new Error('没有权限删除此帖子');
  }

  // 删除帖子
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('删除帖子错误:', error);
    throw error;
  }
  return postId;
};

//获得profiles中的用户id
export const getUserProfile = async (userId) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('获取用户信息错误:', error);
        throw error;
    }
    return profile;
}

// 检查用户是否已经点赞
export const checkUserLike = async (userId, postId) => {
  const { data, error } = await supabase
    .from('post_likes')
    .select('*')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 表示没找到记录
    console.error('检查用户点赞错误:', error);
    throw error;
  }
  return !!data; // 返回 boolean
};

// 添加点赞
export const addLike = async (userId, postId) => {
  const { data, error } = await supabase
    .from('post_likes')
    .insert([{ user_id: userId, post_id: postId }])
    .select();
  
  if (error) {
    console.error('添加点赞错误:', error);
    throw error;
  }
  return data;
};

// 取消点赞
export const removeLike = async (userId, postId) => {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  
  if (error) {
    console.error('取消点赞错误:', error);
    throw error;
  }
  return true;
};

// 获取帖子的评论 - 添加更严格的验证和支持回复功能
export const getComments = async (postId) => {
  if (!postId) {
    console.error('getComments: postId is required');
    throw new Error('帖子ID是必需的');
  }

  try {
    console.log('正在查询评论，postId:', postId);
    
    // 使用正确的查询语法获取评论和用户信息，包括回复相关的信息
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        ),
        mentioned_user:mentioned_user_id (
          display_name,
          avatar_url
        ),
        parent_comment:parent_comment_id (
          user_id,
          profiles:user_id (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('获取评论查询错误:', error);
      throw error;
    }

    console.log('获取到的评论:', comments);
    
    // 如果没有评论，返回空数组
    if (!comments || comments.length === 0) {
      return [];
    }

    return comments;
  } catch (error) {
    console.error('获取评论错误:', error);
    throw error;
  }
};

// 创建评论 - 添加参数验证和回复功能支持
export const createComment = async (commentData) => {
  if (!commentData.post_id) {
    throw new Error('帖子ID是必需的');
  }
  if (!commentData.user_id) {
    throw new Error('用户ID是必需的');
  }
  if (!commentData.content) {
    throw new Error('评论内容是必需的');
  }

  console.log('创建评论，数据:', commentData);

  const { data, error } = await supabase
    .from('comments')
    .insert([commentData])
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      ),
      mentioned_user:mentioned_user_id (
        display_name,
        avatar_url
      )
    `);
  
  if (error) {
    console.error('创建评论错误:', error);
    throw error;
  }
  
  console.log('创建评论成功:', data);
  return data?.[0];
};

// 删除评论
export const deleteComment = async (commentId) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  
  if (error) {
    console.error('删除评论错误:', error);
    throw error;
  }
  return true;
};

// 更新评论计数
export const updatePostCommentsCount = async (postId, change) => {
  if (!postId) {
    throw new Error('帖子ID是必需的');
  }

  console.log('更新评论计数，postId:', postId, 'change:', change);

  // 先获取当前评论数
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('comments')
    .eq('id', postId)
    .single();
  
  if (fetchError) {
    console.error('获取帖子评论数错误:', fetchError);
    throw fetchError;
  }
  
  const newCount = Math.max(0, (post?.comments || 0) + change);
  
  console.log('更新评论数为:', newCount);
  
  const { error } = await supabase
    .from('posts')
    .update({ 
      comments: newCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);
  
  if (error) {
    console.error('更新评论计数错误:', error);
    throw error;
  }
  return newCount;
};

// 确保用户profile存在
export const ensureUserProfile = async (user) => {
  if (!user?.id) {
    throw new Error('用户信息不完整');
  }

  // 检查profile是否存在
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  // 如果profile不存在，则创建
  if (!existingProfile) {
    console.log('创建用户profile:', user.id);
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '用户',
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('创建用户profile失败:', createError);
      throw createError;
    }
    
    return newProfile;
  }

  return existingProfile;
};

// 测试 Storage 配置
export const testStorage = async () => {
  try {
    // 测试上传小文件
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFilePath = 'test/test-file.txt';
    
    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(testFilePath, testBlob);
    
    if (uploadError) {
      console.error('Storage 测试失败:', uploadError);
      return false;
    }
    
    // 测试获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(testFilePath);
    
    console.log('Storage 测试成功，公开URL:', publicUrl);
    return true;
  } catch (error) {
    console.error('Storage 测试异常:', error);
    return false;
  }
};

// 创建评论通知
export const createCommentNotification = async (comment, postId, currentUserId) => {
  try {
    console.log('🔍 开始创建通知...');
  
    // 获取帖子信息
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author, author_id, title')
      .eq('id', postId)
      .single();

    if (postError) {
      console.error('获取帖子信息失败:', postError);
      return;
    }
  
    console.log('📝 帖子信息:', post);

    let postAuthorId = post.author_id;

    // 如果 author_id 为空，通过作者名查找
    if (!postAuthorId && post.author) {
      console.log('🔍 通过作者名查找作者ID...');

      // 使用大小写不敏感的查询
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', post.author); // 使用 ilike 进行大小写不敏感匹配

      console.log('👥 找到的作者:', authorProfiles);

      if (authorProfiles && authorProfiles.length > 0) {
        postAuthorId = authorProfiles[0].id;
        console.log('✅ 找到作者ID:', postAuthorId);
      } else {
        console.log('❌ 未找到对应的作者ID');
        return;
      }
    }

    // 检查是否给自己发通知
    if (!postAuthorId) {
      console.log('❌ 作者ID为空');
      return;
    }

    if (postAuthorId === currentUserId) {
      console.log('ℹ️ 不给自己发通知');
      return;
    }

    console.log('📨 准备创建通知...');
    console.log('接收者ID:', postAuthorId);
    console.log('触发者ID:', currentUserId);

    // 获取当前用户信息
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', currentUserId)
      .single();

    // 创建通知
    const notificationData = {
      user_id: postAuthorId,
      type: 'comment',
      actor_id: currentUserId,
      post_id: postId,
      comment_id: comment.id,
      message: `${currentUser?.display_name || '用户'} 评论了你的帖子《${post.title}》`,
      created_at: new Date().toISOString()
    };

    console.log('📋 通知数据:', notificationData);

    const { data: notification, error: notifyError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select();

    if (notifyError) {
      console.error('❌ 创建通知失败:', notifyError);
    } else {
      console.log('✅ 通知创建成功:', notification);
    }

  } catch (error) {
    console.error('💥 通知创建过程出错:', error);
  }
};

// 创建回复评论通知
export const createReplyNotification = async (comment, postId, currentUserId) => {
  try {
    console.log('🔍 开始创建回复通知...');

    // 检查是否为回复评论
    if (!comment.parent_comment_id) {
      console.log('ℹ️ 不是回复评论，不创建回复通知');
      return;
    }

    // 获取父评论信息
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('user_id, profiles:user_id(display_name)')
      .eq('id', comment.parent_comment_id)
      .single();

    if (parentError) {
      console.error('获取父评论失败:', parentError);
      return;
    }

    // 检查是否给自己发通知
    if (parentComment.user_id === currentUserId) {
      console.log('ℹ️ 不给自己发回复通知');
      return;
    }

    // 获取当前用户信息
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', currentUserId)
      .single();

    // 获取帖子标题
    const { data: post } = await supabase
      .from('posts')
      .select('title')
      .eq('id', postId)
      .single();

    // 创建回复通知
    const notificationData = {
      user_id: parentComment.user_id,
      type: 'reply',
      actor_id: currentUserId,
      post_id: postId,
      comment_id: comment.id,
      message: `${currentUser?.display_name || '用户'} 回复了你的评论：${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`,
      created_at: new Date().toISOString()
    };

    console.log('📋 回复通知数据:', notificationData);

    const { data: notification, error: notifyError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select();

    if (notifyError) {
      console.error('❌ 创建回复通知失败:', notifyError);
      throw notifyError; // 抛出错误让调用方处理
    } else {
      console.log('✅ 回复通知创建成功:', notification);
      return notification; // 返回创建的通知
    }

  } catch (error) {
    console.error('💥 回复通知创建过程出错:', error);
    throw error; // 重新抛出错误
  }
};

// 获取用户通知
export const getUserNotifications = async (userId, limit = 20) => {
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:actor_id (
        display_name,
        avatar_url
      ),
      post:post_id (
        title,
        content
      ),
      comment:comment_id (
        content
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('获取通知失败:', error);
    throw error;
  }
  return notifications;
};

// 获取未读通知数量
export const getUnreadNotificationCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) {
    console.error('获取未读通知数量失败:', error);
    throw error;
  }
  return count;
};

// 标记通知为已读
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', notificationId);
  
  if (error) {
    console.error('标记通知已读失败:', error);
    throw error;
  }
  return true;
};

// 标记所有通知为已读
export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) {
    console.error('标记所有通知已读失败:', error);
    throw error;
  }
  return true;
};
// 调试工具：检查具体的大小写匹配问题
export const debugAuthorMatching = async (postId) => {
  console.group('🔧 调试作者匹配问题');

  // 获取帖子信息
  const { data: post } = await supabase
    .from('posts')
    .select('author, author_id, title')
    .eq('id', postId)
    .single();

  console.log('📝 帖子:', post);

  if (post?.author) {
    // 精确匹配
    const { data: exactMatch } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('display_name', post.author);

    console.log('🔍 精确匹配结果:', exactMatch);

    // 大小写不敏感匹配
    const { data: caseInsensitiveMatch } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', post.author);

    console.log('🔍 大小写不敏感匹配结果:', caseInsensitiveMatch);

    // 所有用户
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name');

    console.log('👥 所有用户:', allProfiles);
  }

  console.groupEnd();
};

// 更新帖子作者信息（当用户修改昵称或头像时）
export const updatePostAuthorInfo = async (userId, userInfo) => {
  const { error } = await supabase
    .from('posts')
    .update({
      author: userInfo.display_name,
      avatar: userInfo.avatar_url
    })
    .eq('author_id', userId);

  if (error) {
    console.error('更新帖子作者信息错误:', error);
    throw error;
  }
  return true;
};

// 获取用户发布的帖子
export const getUserPosts = async (userId) => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户帖子错误:', error);
    throw error;
  }
  return posts;
};

// 检查用户是否已经点赞路线
export const checkUserRouteLike = async (userId, routeId) => {
  const { data, error } = await supabase
    .from('route_likes')
    .select('*')
    .eq('user_id', userId)
    .eq('route_id', routeId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 表示没找到记录
    console.error('检查用户路线点赞错误:', error);
    throw error;
  }
  return !!data;
};

// client.js - 修改函数名称避免重复

// 通用点赞函数 - 修改名称
export const addLikeRecord = async (userId, targetId, targetType) => {
  const { data, error } = await supabase
    .from('likes')
    .insert([{ 
      user_id: userId, 
      target_id: targetId,
      target_type: targetType 
    }])
    .select();

  if (error) {
    console.error('添加点赞错误:', error);
    throw error;
  }
  return data;
};

export const removeLikeRecord = async (userId, targetId, targetType) => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .eq('target_type', targetType);

  if (error) {
    console.error('取消点赞错误:', error);
    throw error;
  }
  return true;
};

// 获取用户点赞的路线ID数组（用于检查点赞状态）
export const getUserLikedRouteIds = async (userId) => {
  const { data: likesData, error: likesError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'route');

  if (likesError) {
    console.error('获取用户点赞路线错误:', likesError);
    throw likesError;
  }

  if (likesData.length === 0) return [];

  return likesData.map(item => item.target_id);
};

// 获取用户点赞的地点ID数组（用于检查点赞状态）
export const getUserLikedLocationIds = async (userId) => {
  const { data: likesData, error: likesError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'location');

  if (likesError) {
    console.error('获取用户点赞地点错误:', likesError);
    throw likesError;
  }

  if (likesData.length === 0) return [];

  return likesData.map(item => item.target_id);
};

// 获取用户点赞的完整路线信息（用于个人中心显示）
export const getUserLikedRoutes = async (userId) => {
  // 1. 先获取用户点赞的路线ID
  const { data: likesData, error: likesError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'route');

  if (likesError) {
    console.error('获取用户点赞路线错误:', likesError);
    throw likesError;
  }

  if (likesData.length === 0) return [];

  // 2. 根据路线ID获取完整的路线数据，包括城市信息
  const routeIds = likesData.map(item => item.target_id);
  const { data: routesData, error: routesError } = await supabase
    .from('city_routes')
    .select(`
      *,
      cities:city_id (
        name
      )
    `)
    .in('id', routeIds);

  if (routesError) {
    console.error('获取路线数据错误:', routesError);
    throw routesError;
  }

  return routesData || [];
};

// 获取用户点赞的完整地点信息（用于个人中心显示）
export const getUserLikedLocations = async (userId) => {
  // 1. 先获取用户点赞的地点ID
  const { data: likesData, error: likesError } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'location');

  if (likesError) {
    console.error('获取用户点赞地点错误:', likesError);
    throw likesError;
  }

  if (likesData.length === 0) return [];

  // 2. 根据地点ID获取完整的地点数据，包括城市信息
  const locationIds = likesData.map(item => item.target_id);
  const { data: locationsData, error: locationsError } = await supabase
    .from('city_locations')
    .select(`
      *,
      cities:city_id (
        name
      )
    `)
    .in('id', locationIds);

  if (locationsError) {
    console.error('获取地点数据错误:', locationsError);
    throw locationsError;
  }

  return locationsData || [];
};

// 获取用户点赞的帖文
export const getLikedPosts = async (userId) => {
  // 1. 先获取用户点赞的帖文ID
  const { data: likesData, error: likesError } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId);

  if (likesError) {
    console.error('获取用户点赞帖文错误:', likesError);
    throw likesError;
  }

  if (likesData.length === 0) return [];

  // 2. 根据帖文ID获取完整的帖文数据
  const postIds = likesData.map(item => item.post_id);
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('id', postIds)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('获取帖文数据错误:', postsError);
    throw postsError;
  }

  return postsData || [];
};

// 获取所有数字文创产品
export const getDigitalProducts = async () => {
  const { data: products, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取数字文创产品错误:', error);
    throw error;
  }
  return products;
};

// 根据ID获取单个数字文创产品
export const getDigitalProductById = async (productId) => {
  const { data: product, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error('获取数字文创产品详情错误:', error);
    throw error;
  }
  return product;
};

// 获取热门数字文创产品
export const getFeaturedDigitalProducts = async (limit = 10) => {
  const { data: products, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('获取热门数字文创产品错误:', error);
    throw error;
  }
  return products;
};

// 根据分类获取数字文创产品
export const getDigitalProductsByCategory = async (category, limit = 20) => {
  const { data: products, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('status', 'published')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('按分类获取数字文创产品错误:', error);
    throw error;
  }
  return products;
};

// 搜索数字文创产品
export const searchDigitalProducts = async (query, limit = 20) => {
  const { data: products, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('status', 'published')
    .ilike('name', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('搜索数字文创产品错误:', error);
    throw error;
  }
  return products;
};

// 添加到购物车
export const addToCart = async (userId, productId, quantity = 1) => {
  // 首先检查用户是否已经拥有该商品
  /*const alreadyOwned = await checkUserOwnsProduct(userId, productId);
  if (alreadyOwned) {
    throw new Error('您已拥有该商品，请勿重复购买！');
  }*/

  const { data, error } = await supabase
    .from('user_collections')
    .upsert({
      user_id: userId,
      product_id: productId,
      collection_type: 'cart',
      quantity: quantity,
      added_to_cart_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,product_id,collection_type',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('添加到购物车错误:', error);
    throw error;
  }
  return data;
};

// 获取用户购物车商品
export const getCartItems = async (userId) => {
  const { data: cartItems, error } = await supabase
    .from('user_collections')
    .select(`
      *,
      digital_products (*)
    `)
    .eq('user_id', userId)
    .eq('collection_type', 'cart');

  if (error) {
    console.error('获取购物车错误:', error);
    throw error;
  }
  return cartItems;
};

// 获取用户已购买商品
export const getPurchasedItems = async (userId) => {
  const { data: purchasedItems, error } = await supabase
    .from('user_collections')
    .select(`
      *,
      digital_products (*)
    `)
    .eq('user_id', userId)
    .eq('collection_type', 'owned')
    .order('purchased_at', { ascending: false });

  if (error) {
    console.error('获取已购买商品错误:', error);
    throw error;
  }
  return purchasedItems;
};

// 更新购物车商品数量
export const updateCartItemQuantity = async (userId, productId, quantity) => {
  const { error } = await supabase
    .from('user_collections')
    .update({
      quantity: quantity,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('collection_type', 'cart');

  if (error) {
    console.error('更新购物车数量错误:', error);
    throw error;
  }
  return true;
};

// 从购物车移除商品
export const removeFromCart = async (userId, productId) => {
  const { error } = await supabase
    .from('user_collections')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('collection_type', 'cart');

  if (error) {
    console.error('从购物车移除错误:', error);
    throw error;
  }
  return true;
};

// 创建订单（模拟支付）
export const createOrder = async (userId, items) => {
  console.log('创建订单开始，用户ID:', userId, '商品数量:', items.length);

  // 检查购买限额（第二道防线）
  for (const item of items) {
    const isLimitReached = await checkProductPurchaseLimit(userId, item.product_id, item.quantity);
    if (isLimitReached) {
      throw new Error('商品达到购买限额啦！看看别的吧~');
    }
  }

  // 计算总金额
  const totalAmount = items.reduce((total, item) => {
    return total + (item.digital_products?.price || 0) * item.quantity;
  }, 0);

  console.log('订单总金额:', totalAmount);

  // 使用服务角色客户端创建订单（绕过RLS）
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      status: 'paid', // 模拟支付成功
      paid_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orderError) {
    console.error('创建订单错误:', orderError);
    throw orderError;
  }

  console.log('订单创建成功:', order);

  // 创建订单项
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.digital_products?.price || 0,
    total_price: (item.digital_products?.price || 0) * item.quantity,
    product_name: item.digital_products?.name,
    product_description: item.digital_products?.description
  }));

  console.log('订单项:', orderItems);

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('创建订单项错误:', itemsError);
    throw itemsError;
  }

  console.log('订单项创建成功');

  // 更新用户收藏（从购物车移动到已购买）
  for (const item of items) {
    console.log('更新用户收藏，记录ID:', item.id, '商品ID:', item.product_id);

    const { error: updateError } = await supabase
      .from('user_collections')
      .update({
        collection_type: 'owned',
        purchased_at: new Date().toISOString(),
        order_id: order.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', item.id)  // 使用user_collections的ID而不是product_id
      .eq('collection_type', 'cart');

    if (updateError) {
      console.error('更新用户收藏错误:', updateError);
    } else {
      console.log('用户收藏更新成功，记录ID:', item.id);
    }
  }

  console.log('订单处理完成');
  return order;
};

// 达人相关函数

// 获取所有达人（包含关联数据）
export const getAllInstructors = async () => {
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select(`
      *,
      workshops:workshops(*),
      stories:instructor_stories(*),
      routes:instructor_routes(*)
    `)
    .order('rating', { ascending: false });

  if (error) {
    console.error('获取达人列表错误:', error);
    throw error;
  }
  return instructors;
};

// 根据搜索条件获取达人
export const searchInstructors = async (query, sortBy = 'rating') => {
  let queryBuilder = supabase
    .from('instructors')
    .select(`
      *,
      workshops:workshops(*),
      stories:instructor_stories(*),
      routes:instructor_routes(*)
    `);

  // 应用搜索条件
  if (query) {
    queryBuilder = queryBuilder
      .or(`name.ilike.%${query}%,bio.ilike.%${query}%,expertise.cs.{${query}}`);
  }

  // 应用排序
  if (sortBy === 'rating') {
    queryBuilder = queryBuilder.order('rating', { ascending: false });
  } else if (sortBy === 'workshops') {
    queryBuilder = queryBuilder.order('workshop_count', { ascending: false });
  } else if (sortBy === 'students') {
    queryBuilder = queryBuilder.order('student_count', { ascending: false });
  }

  const { data: instructors, error } = await queryBuilder;

  if (error) {
    console.error('搜索达人错误:', error);
    throw error;
  }
  return instructors;
};

// 根据ID获取单个达人详情
export const getInstructorById = async (instructorId) => {
  const { data: instructor, error } = await supabase
    .from('instructors')
    .select(`
      *,
      workshops:workshops(*),
      stories:instructor_stories(*),
      routes:instructor_routes(*)
    `)
    .eq('id', instructorId)
    .single();

  if (error) {
    console.error('获取达人详情错误:', error);
    throw error;
  }
  return instructor;
};

// 创建新达人
export const createInstructor = async (instructorData) => {
  const { data: instructor, error } = await supabase
    .from('instructors')
    .insert([instructorData])
    .select()
    .single();

  if (error) {
    console.error('创建达人错误:', error);
    throw error;
  }
  return instructor;
};

// 更新达人信息
export const updateInstructor = async (instructorId, instructorData) => {
  const { data: instructor, error } = await supabase
    .from('instructors')
    .update(instructorData)
    .eq('id', instructorId)
    .select()
    .single();

  if (error) {
    console.error('更新达人错误:', error);
    throw error;
  }
  return instructor;
};

// 删除达人
export const deleteInstructor = async (instructorId) => {
  const { error } = await supabase
    .from('instructors')
    .delete()
    .eq('id', instructorId);

  if (error) {
    console.error('删除达人错误:', error);
    throw error;
  }
  return true;
};

// 检查用户是否关注达人
export const checkUserFollowsInstructor = async (userId, instructorId) => {
  const { data, error } = await supabase
    .from('user_follows')
    .select('*')
    .eq('user_id', userId)
    .eq('instructor_id', instructorId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 表示没找到记录
    console.error('检查用户关注状态错误:', error);
    throw error;
  }
  return !!data; // 返回 boolean
};

// 关注达人
export const followInstructor = async (userId, instructorId) => {
  const { data, error } = await supabase
    .from('user_follows')
    .insert([{ user_id: userId, instructor_id: instructorId }])
    .select();

  if (error) {
    console.error('关注达人错误:', error);
    throw error;
  }
  return data;
};

// 取消关注达人
export const unfollowInstructor = async (userId, instructorId) => {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('user_id', userId)
    .eq('instructor_id', instructorId);

  if (error) {
    console.error('取消关注达人错误:', error);
    throw error;
  }
  return true;
};

// 获取用户关注的达人列表
export const getUserFollowingInstructors = async (userId) => {
  if (!userId) {
    throw new Error('用户ID是必需的');
  }

  // 先获取用户关注的所有达人ID
  const { data: follows, error: followsError } = await supabase
    .from('user_follows')
    .select('instructor_id')
    .eq('user_id', userId);

  if (followsError) {
    console.error('获取用户关注列表错误:', followsError);
    throw followsError;
  }

  if (!follows || follows.length === 0) {
    return [];
  }

  // 提取达人ID
  const instructorIds = follows.map(follow => follow.instructor_id);

  // 根据达人ID获取完整的达人信息
  const { data: instructors, error: instructorsError } = await supabase
    .from('instructors')
    .select('*')
    .in('id', instructorIds);

  if (instructorsError) {
    console.error('获取达人信息错误:', instructorsError);
    throw instructorsError;
  }

  return instructors || [];
};

// 获取所有工作坊
export const getWorkshops = async (filters = {}, sortBy = 'created_at') => {
  let query = supabase
    .from('workshops')
    .select(`
      *,
      instructors (id, name, avatar, bio, rating, review_count),
      workshop_categories (id, name, description, color)
    `)
    .eq('status', 'active');

  // 应用筛选条件 - 修复分类筛选
  if (filters.category && filters.category !== "all") {
    query = query.eq('category_id', parseInt(filters.category) || filters.category);
  }
  
  if (filters.instructor) {
    query = query.eq('instructor_id', filters.instructor);
  }
  
  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice);
  }
  
  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }

  // 添加城市筛选支持
  if (filters.city) {
    query = query.eq('city_id', parseInt(filters.city) || filters.city);
  }

  // 应用排序
// 确保排序字段存在
if (sortBy === 'price_asc') {
  query = query.order('price', { ascending: true });
} else if (sortBy === 'price_desc') {
  query = query.order('price', { ascending: false });
} else if (sortBy === 'date_asc') {
  query = query.order('open_date', { ascending: true }); // 确保 open_date 字段存在
} else if (sortBy === 'date_desc') {
  query = query.order('open_date', { ascending: false });
} else if (sortBy === 'popularity') {
  query = query.order('remaining_seats', { ascending: true });
} else {
  query = query.order('created_at', { ascending: false });
}

  const { data: workshops, error } = await query;

  if (error) {
    console.error('获取工作坊错误:', error);
    throw error;
  }

  return workshops || [];
};

// 根据ID获取单个工作坊
export const getWorkshopById = async (workshopId) => {
  const { data: workshop, error } = await supabase
    .from('workshops')
    .select(`
      *,
      instructors(id, name, avatar, bio, rating, review_count),
      workshop_categories (id, name, description, color)
    `)
    .eq('id', workshopId)
    .single();

  if (error) {
    console.error('获取工作坊详情错误:', error);
    throw error;
  }

  return workshop;
};

// 根据达人ID获取工作坊
export const getWorkshopsByInstructor = async (instructorId) => {
  const { data: workshops, error } = await supabase
    .from('workshops')
    .select(`
      *,
      instructors (id, name, avatar, bio, rating, review_count),
      workshop_categories (id, name, description, color)
    `)
    .eq('instructor_id', instructorId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取达人工作坊错误:', error);
    throw error;
  }

  return workshops || [];
};


// 如果需要搜索讲师名称，使用不同的方法
export const searchWorkshops = async (query) => {
  if (!query || query.trim() === '') {
    return await getWorkshops();
  }

  const searchTerm = `%${query.trim()}%`;
  
  // 先搜索工作坊标题和描述
  const { data: workshops, error } = await supabase
    .from('workshops')
    .select(`
      *,
      instructors (id, name, avatar, bio, rating, review_count),
      workshop_categories (id, name, description, color)
    `)
    .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('搜索工作坊错误:', error);
    throw error;
  }

  return workshops || [];
};

// 获取工作坊分类
export const getWorkshopCategories = async () => {
  const { data: categories, error } = await supabase
    .from('workshop_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('获取工作坊分类错误:', error);
    throw error;
  }

  return categories || [];
};

// 创建工作坊预约
export const createWorkshopBooking = async (bookingData) => {
  const { data, error } = await supabase
    .from('workshop_bookings')
    .insert([{
      user_id: bookingData.userId,
      workshop_id: bookingData.workshopId,
      participant_name: bookingData.participantName,
      participant_phone: bookingData.participantPhone,
      notes: bookingData.notes || '',
      status: 'pending_payment', // 初始状态为待支付
      total_amount: bookingData.totalAmount
    }])
    .select();

  if (error) {
    console.error('创建工作坊预约错误:', error);
    throw error;
  }

  return data?.[0];
};

// 获取用户的工作坊预约记录
export const getUserWorkshopBookings = async (userId) => {
  const { data: bookings, error } = await supabase
    .from('workshop_bookings')
    .select(`
      *,
      workshops (
        id,
        title,
        image,
        location,
        open_date,
        duration_minutes,
        instructors(id,name,avatar_url,bio)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户预约记录错误:', error);
    throw error;
  }

  return bookings || [];
};

// 更新工作坊预约状态（支付成功后）
export const updateBookingStatus = async (bookingId, status) => {
  const { data, error } = await supabase
    .from('workshop_bookings')
    .update({ status })
    .eq('id', bookingId)
    .select();

  if (error) {
    console.error('更新预约状态错误:', error);
    throw error;
  }

  return data?.[0];
};

// 检查是否已存在相同姓名的预约
export const checkDuplicateBooking = async (workshopId, participantName) => {
  console.log('检查重复预约:', { workshopId, participantName });

  const { data, error } = await supabase
    .from('workshop_bookings')
    .select('id')
    .eq('workshop_id', workshopId)
    .eq('participant_name', participantName)
    .in('status', ['pending_payment', 'confirmed']); // 检查待支付和已确认的预约

  if (error) {
    console.error('检查重复预约错误:', error);
    throw error;
  }

  console.log('重复预约检查结果:', data);
  return data && data.length > 0;
};

// 更新工作坊剩余席位
export const updateWorkshopSeats = async (workshopId, changeAmount) => {
  const { data, error } = await supabase
    .from('workshops')
    .select('remaining_seats, total_seats')
    .eq('id', workshopId)
    .single();

  if (error) {
    console.error('获取工作坊席位错误:', error);
    throw error;
  }

  const newRemainingSeats = data.remaining_seats + changeAmount;

  // 确保席位不会超过总数或小于0
  const finalSeats = Math.max(0, Math.min(newRemainingSeats, data.total_seats));

  const { data: updatedWorkshop, error: updateError } = await supabase
    .from('workshops')
    .update({ remaining_seats: finalSeats })
    .eq('id', workshopId)
    .select()
    .single();

  if (updateError) {
    console.error('更新工作坊席位错误:', updateError);
    throw updateError;
  }

  return updatedWorkshop;
};

// 创建工作坊预约（包含席位检查）
export const createWorkshopBookingWithValidation = async (bookingData) => {
  console.log('开始预约验证:', bookingData);

  // 1. 检查是否已存在相同姓名的预约
  const isDuplicate = await checkDuplicateBooking(bookingData.workshopId, bookingData.participantName);
  console.log('重复预约检查结果:', isDuplicate);

  if (isDuplicate) {
    console.log('发现重复预约，抛出错误');
    throw new Error('DUPLICATE_BOOKING');
  }

  // 2. 检查工作坊是否已满
  const { data: workshop } = await supabase
    .from('workshops')
    .select('remaining_seats, total_seats')
    .eq('id', bookingData.workshopId)
    .single();

  console.log('工作坊席位信息:', workshop);

  if (workshop.remaining_seats <= 0) {
    console.log('工作坊已满，抛出错误');
    throw new Error('WORKSHOP_FULL');
  }

  // 3. 创建预约
  console.log('开始创建预约');
  const booking = await createWorkshopBooking(bookingData);
  console.log('预约创建成功:', booking);

  // 4. 更新工作坊席位（减少一个席位）
  console.log('开始更新席位');
  await updateWorkshopSeats(bookingData.workshopId, -1);
  console.log('席位更新成功');

  return booking;
};

// 检查用户是否已拥有某个商品
/*export const checkUserOwnsProduct = async (userId, productId) => {
  const { data, error } = await supabase
    .from('user_collections')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('collection_type', 'owned')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 表示没找到记录
    console.error('检查用户拥有商品错误:', error);
    throw error;
  }

  return !!data; // 返回 boolean
};*/

// 检查用户是否已达到某个商品的购买限额

export const checkProductPurchaseLimit = async (userId, productId, cartQuantity = 0) => {
  const { data, error } = await supabase
    .from('user_collections')
    .select('quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('collection_type', 'owned')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 表示没找到记录
    console.error('检查商品购买数量错误:', error);
    throw error;
  }

  // 如果用户没有购买过该商品，返回当前数量为0
  const currentQuantity = data?.quantity || 0;

  // 检查是否达到限额（10个）- 用户已有的 + 购物车中要购买的数量
  return (currentQuantity + cartQuantity) > 10;
};
