/**
 * AI 个性化推荐 Feed 组件
 * 展示多路召回 + 精排结果，支持实时行为反馈
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ThumbsUp, ThumbsDown, MapPin, Clock, Star, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getRecommendations, behaviorTracker } from '@/services/aiBackend';

const STRATEGY_LABELS = {
  embedding_recall: '语义匹配',
  sequential_recall: '猜你喜欢',
  graph_recall: '协同推荐',
  hot_recall: '热门精选',
  multi_recall_fusion: 'AI 推荐',
};

const TYPE_COLORS = {
  workshop: 'bg-amber-100 text-amber-700',
  bookstore: 'bg-blue-100 text-blue-700',
  gallery: 'bg-purple-100 text-purple-700',
  cafe: 'bg-green-100 text-green-700',
  museum: 'bg-red-100 text-red-700',
  park: 'bg-emerald-100 text-emerald-700',
};

const RecommendCard = ({ item, index, onFeedback, onClick }) => {
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const viewStartRef = useRef(Date.now());

  useEffect(() => {
    // 曝光上报
    behaviorTracker.trackView(item.id, item.type);
    viewStartRef.current = Date.now();

    return () => {
      // 离开时上报停留时长
      const dwell = Date.now() - viewStartRef.current;
      if (dwell > 1000) {
        behaviorTracker.trackDwell(item.id, item.type, dwell);
      }
    };
  }, [item.id]);

  const handleClick = () => {
    behaviorTracker.trackClick(item.id, item.type, index);
    onClick?.(item);
  };

  const handleFeedback = (type, e) => {
    e.stopPropagation();
    setFeedbackGiven(type);
    if (type === 'like') {
      behaviorTracker.trackLike(item.id, item.type);
    }
    onFeedback?.(item.id, type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* 图片占位 */}
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">{item.name}</h3>
                {item.is_ad && (
                  <Badge variant="outline" className="text-xs px-1 py-0 text-orange-500 border-orange-300">
                    广告
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {item.description}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[item.type] || ''}`}>
                  {item.type}
                </Badge>
                {item.similarity && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Star className="w-3 h-3" />
                    {(item.similarity * 100).toFixed(0)}% 匹配
                  </span>
                )}
                {item.recall_source && (
                  <span className="text-xs text-indigo-500 flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    {STRATEGY_LABELS[item.recall_source] || item.recall_source}
                  </span>
                )}
              </div>
            </div>

            {/* 反馈按钮 */}
            <div className="flex flex-col gap-1 items-center justify-center">
              <button
                className={`p-1 rounded hover:bg-green-50 transition ${feedbackGiven === 'like' ? 'text-green-500' : 'text-gray-300'}`}
                onClick={(e) => handleFeedback('like', e)}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                className={`p-1 rounded hover:bg-red-50 transition ${feedbackGiven === 'dislike' ? 'text-red-500' : 'text-gray-300'}`}
                onClick={(e) => handleFeedback('dislike', e)}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const AIRecommendFeed = ({ userId, cityId, scene = 'home_feed', onItemClick }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [strategy, setStrategy] = useState('');

  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await getRecommendations({
        userId,
        cityId,
        scene,
        topK: 20,
      });
      setItems(response.items || []);
      setStrategy(response.strategy || 'multi_recall_fusion');
    } catch (err) {
      console.error('推荐加载失败:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, cityId, scene]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleFeedback = (itemId, type) => {
    // 负反馈：从列表中移除
    if (type === 'dislike') {
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium">为你推荐</span>
          <Badge variant="outline" className="text-xs">
            {STRATEGY_LABELS[strategy] || strategy}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="ml-1 text-xs">换一批</span>
        </Button>
      </div>

      {/* 推荐列表 */}
      <div className="space-y-2 px-4">
        <AnimatePresence>
          {items.map((item, index) => (
            <RecommendCard
              key={item.id}
              item={item}
              index={index}
              onFeedback={handleFeedback}
              onClick={onItemClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          暂无推荐，去逛逛其他地方吧 ✨
        </div>
      )}
    </div>
  );
};

export default AIRecommendFeed;
