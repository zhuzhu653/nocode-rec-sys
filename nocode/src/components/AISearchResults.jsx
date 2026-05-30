/**
 * AI 搜索结果页 — 展示语义搜索 + Query 理解 + 广告混排结果
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, Filter, MapPin, Tag, Lightbulb, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { semanticSearch, behaviorTracker } from '@/services/aiBackend';

const INTENT_ICONS = {
  navigational: '📍',
  informational: 'ℹ️',
  transactional: '🛒',
  exploratory: '🔍',
};

const AISearchResults = ({ query, cityId, onItemClick }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null); // query understanding 元信息

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, cityId]);

  const performSearch = async (q) => {
    setLoading(true);
    try {
      const response = await semanticSearch(q, { cityId, topK: 15 });
      setResults(response.results || []);
      setMeta(response.meta || null);
      behaviorTracker.trackSearch(q, (response.results || []).length);
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item, position) => {
    behaviorTracker.trackClick(item.id, item.type, position);
    onItemClick?.(item);
  };

  if (!query) return null;

  return (
    <div className="space-y-4">
      {/* Query 理解展示 */}
      {meta && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50 rounded-lg p-3 mx-4"
        >
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-indigo-500" />
            <span className="text-indigo-700 font-medium">AI 理解</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.intent && (
              <Badge variant="secondary" className="text-xs">
                {INTENT_ICONS[meta.intent]} 意图: {meta.intent}
              </Badge>
            )}
            {meta.entities?.map((entity, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {entity}
              </Badge>
            ))}
            {meta.expanded_query && meta.expanded_query !== query && (
              <span className="text-xs text-muted-foreground">
                扩展: "{meta.expanded_query}"
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* 搜索结果 */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {loading ? '搜索中...' : `找到 ${results.length} 个结果`}
          </span>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-1" />
            筛选
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleItemClick(item, index)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{item.name}</h4>
                          {item.is_ad && (
                            <Badge className="text-xs px-1 py-0 bg-orange-50 text-orange-600 border-orange-200">
                              <Megaphone className="w-3 h-3 mr-0.5" />
                              推广
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-indigo-500">
                            {(item.similarity * 100).toFixed(0)}% 相关
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">没有找到相关结果</p>
            <p className="text-xs mt-1">试试换个关键词？</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearchResults;
