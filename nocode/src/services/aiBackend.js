/**
 * AI 后端 API 服务
 * 对接 FastAPI 搜索/推荐/对话 接口
 * 支持 Mock 模式：无后端时自动降级为本地模拟数据
 */

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:8000';

// Mock 模式：后端不可用时自动降级
let _mockMode = import.meta.env.VITE_AI_MOCK === 'true';
let _backendChecked = false;

const checkBackendAvailable = async () => {
  if (_backendChecked) return !_mockMode;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${AI_BACKEND_URL}/health`, { signal: controller.signal });
    _mockMode = !res.ok;
  } catch {
    _mockMode = true;
  }
  _backendChecked = true;
  return !_mockMode;
};

// 初始化时检测后端
checkBackendAvailable();

// ========== Mock 数据 ==========
const MOCK_LOCATIONS = [
  { id: '1', name: '隐世书局', type: 'bookstore', description: '藏在胡同深处的独立书店，适合安静阅读', similarity: 0.95, city_id: 1 },
  { id: '2', name: '拾光陶社', type: 'workshop', description: '传统陶艺与现代设计的融合空间', similarity: 0.91, city_id: 1 },
  { id: '3', name: '云间美术馆', type: 'gallery', description: '当代先锋艺术展览空间', similarity: 0.88, city_id: 2 },
  { id: '4', name: '梧桐院·茶', type: 'cafe', description: '民国老宅改造的沉浸式茶空间', similarity: 0.86, city_id: 3 },
  { id: '5', name: '竹里工坊', type: 'workshop', description: '非遗竹编手工体验', similarity: 0.84, city_id: 4 },
  { id: '6', name: '城墙根花园', type: 'park', description: '城墙下的秘密花园，四季皆景', similarity: 0.82, city_id: 5 },
  { id: '7', name: '山城版画社', type: 'gallery', description: '重庆本土版画创作与展示', similarity: 0.79, city_id: 6 },
  { id: '8', name: '鹿鸣书社', type: 'bookstore', description: '学术氛围浓厚的人文书店', similarity: 0.77, city_id: 3 },
  { id: '9', name: '花间集', type: 'workshop', description: '东方插花美学体验', similarity: 0.75, city_id: 2 },
  { id: '10', name: '时光印象馆', type: 'museum', description: '老物件收藏与城市记忆展', similarity: 0.73, city_id: 1 },
];

const MOCK_CHAT_REPLIES = [
  '根据你的偏好，我推荐「隐世书局」——一家藏在胡同深处的独立书店。这里有舒适的阅读角，常年举办诗歌朗诵会。周末下午去最好，人少且有免费咖啡供应。',
  '如果你喜欢文艺，我推荐这条路线：先去「拾光陶社」体验手工陶艺（约2小时），再步行到隔壁的「梧桐院·茶」喝下午茶，最后去「云间美术馆」看当代艺术展。一天的文艺之旅！',
  '周末适合去的文艺地方有很多！「城墙根花园」适合散步发呆；如果想动手做点什么，「竹里工坊」的非遗竹编体验很治愈；想安静一点就去「鹿鸣书社」，那里有一面落地窗，可以边看书边看外面的梧桐树。',
];

/**
 * AI 语义搜索（含 Mock 降级）
 */
export const semanticSearch = async (query, options = {}) => {
  if (_mockMode) {
    // Mock: 简单字符串匹配模拟语义搜索
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
    const q = query.toLowerCase();
    const results = MOCK_LOCATIONS
      .filter(item => {
        if (options.cityId && item.city_id !== options.cityId) return false;
        return item.name.includes(q) || item.description.includes(q) || item.type.includes(q) || Math.random() > 0.4;
      })
      .slice(0, options.topK || 8)
      .map((item, i) => ({ ...item, similarity: 0.95 - i * 0.03 }));
    return { results, source: 'mock' };
  }

  const response = await fetch(`${AI_BACKEND_URL}/api/search/semantic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      city_id: options.cityId || null,
      category: options.category || null,
      top_k: options.topK || 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`搜索失败: ${response.status}`);
  }

  return response.json();
};

/**
 * 获取个性化推荐（含 Mock 降级）
 */
export const getRecommendations = async (options = {}) => {
  if (_mockMode) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
    const shuffled = [...MOCK_LOCATIONS].sort(() => Math.random() - 0.5);
    return { items: shuffled.slice(0, options.topK || 10), source: 'mock', strategy: 'multi_recall_fusion' };
  }

  const response = await fetch(`${AI_BACKEND_URL}/api/recommend/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: options.userId || null,
      scene: options.scene || 'home_feed',
      item_id: options.itemId || null,
      city_id: options.cityId || null,
      top_k: options.topK || 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`推荐失败: ${response.status}`);
  }

  return response.json();
};

/**
 * 获取相似内容推荐（含 Mock 降级）
 */
export const getSimilarItems = async (itemId, topK = 5) => {
  if (_mockMode) {
    await new Promise(r => setTimeout(r, 200));
    const shuffled = [...MOCK_LOCATIONS].filter(i => i.id !== itemId).sort(() => Math.random() - 0.5);
    return { items: shuffled.slice(0, topK), source: 'mock' };
  }

  const response = await fetch(
    `${AI_BACKEND_URL}/api/recommend/similar/${itemId}?top_k=${topK}`
  );

  if (!response.ok) {
    throw new Error(`相似推荐失败: ${response.status}`);
  }

  return response.json();
};

/**
 * AI 对话式推荐（含 Mock 降级）
 */
export const chatRecommend = async (message, options = {}) => {
  if (_mockMode) {
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    const reply = MOCK_CHAT_REPLIES[Math.floor(Math.random() * MOCK_CHAT_REPLIES.length)];
    return { reply, source: 'mock' };
  }

  const response = await fetch(`${AI_BACKEND_URL}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: options.history || [],
      user_id: options.userId || null,
      city_id: options.cityId || null,
    }),
  });

  if (!response.ok) {
    throw new Error(`对话推荐失败: ${response.status}`);
  }

  return response.json();
};

/**
 * 行为事件上报
 */
class BehaviorTracker {
  constructor() {
    this.buffer = [];
    this.flushInterval = setInterval(() => this.flush(), 5000);
    this.sessionId = this._generateSessionId();
  }

  track(event) {
    this.buffer.push({
      ...event,
      timestamp: Date.now(),
    });
  }

  trackView(itemId, itemType) {
    this.track({ event: 'view', item_id: itemId, item_type: itemType });
  }

  trackClick(itemId, itemType, position) {
    this.track({ event: 'click', item_id: itemId, item_type: itemType, position });
  }

  trackLike(itemId, itemType) {
    this.track({ event: 'like', item_id: itemId, item_type: itemType });
  }

  trackSearch(query, resultCount) {
    this.track({ event: 'search', query, result_count: resultCount });
  }

  trackDwell(itemId, itemType, durationMs) {
    this.track({ event: 'dwell', item_id: itemId, item_type: itemType, duration_ms: durationMs });
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(`${AI_BACKEND_URL}/api/track/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this._getUserId(),
          session_id: this.sessionId,
          events,
        }),
      });
    } catch (e) {
      // 上报失败不影响用户体验，静默处理
      console.warn('行为上报失败:', e.message);
    }
  }

  _getUserId() {
    // 从 Supabase session 获取 userId
    try {
      const session = JSON.parse(localStorage.getItem('sb-db0pq2tvjkuyx5-auth-token') || '{}');
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  _generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  destroy() {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

// 全局行为追踪器
export const tracker = new BehaviorTracker();
