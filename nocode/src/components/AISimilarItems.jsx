/**
 * 相似推荐组件 — 详情页底部 "相似推荐" 横向卡片列表
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getSimilarItems, behaviorTracker } from '@/services/aiBackend';

const AISimilarItems = ({ itemId, itemType, onItemClick }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    getSimilarItems(itemId, 6)
      .then(res => setItems(res.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  const handleClick = (item, index) => {
    behaviorTracker.trackClick(item.id, item.type, index);
    onItemClick?.(item);
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-40 h-32 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 px-4 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-medium">相似推荐</span>
        <Badge variant="outline" className="text-xs">AI</Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 px-4 pb-2">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0"
            >
              <Card
                className="w-40 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleClick(item, index)}
              >
                <CardContent className="p-3">
                  <div className="w-full h-16 rounded-md bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h4 className="text-xs font-medium truncate">{item.name}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                  {item.similarity && (
                    <span className="text-xs text-indigo-400 mt-1 block">
                      {(item.similarity * 100).toFixed(0)}% 匹配
                    </span>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default AISimilarItems;
