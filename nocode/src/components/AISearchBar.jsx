/**
 * AI 搜索组件 - 语义搜索 + 对话式推荐
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Send, X, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { semanticSearch, chatRecommend } from '@/services/aiBackend';

const AISearchBar = ({ cityId, onResultClick }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [mode, setMode] = useState('search'); // 'search' | 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // 点击外部关闭结果面板
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 语义搜索
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await semanticSearch(query, { cityId, topK: 8 });
      setResults(response.results || []);
    } catch (error) {
      console.error('AI 搜索失败:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 对话式推荐
  const handleChat = async () => {
    if (!query.trim()) return;

    const userMessage = query;
    setQuery('');
    setChatLoading(true);
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await chatRecommend(userMessage, {
        history: chatMessages,
        cityId,
      });
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.reply },
      ]);
    } catch (error) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: '抱歉，AI 助手暂时不可用，请稍后再试~' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (mode === 'search') {
        handleSearch();
      } else {
        handleChat();
      }
    }
  };

  const typeIcon = {
    museum: '🏛️',
    gallery: '🎨',
    bookstore: '📚',
    cafe: '☕',
    park: '🌿',
    workshop: '🔨',
    product: '🛍️',
    location: '📍',
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={resultsRef}>
      {/* 搜索栏 */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-full shadow-lg border border-[#e8e3db] overflow-hidden">
          {/* 模式切换 */}
          <button
            onClick={() => setMode(mode === 'search' ? 'chat' : 'search')}
            className="px-3 py-2 text-sm text-[#d4a373] hover:bg-[#f9f7f3] transition-colors"
            title={mode === 'search' ? '切换到对话模式' : '切换到搜索模式'}
          >
            {mode === 'search' ? <Search className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </button>

          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={
              mode === 'search'
                ? '试试语义搜索：安静适合读书的地方...'
                : '问问 AI：周末去哪里比较文艺？'
            }
            className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-base"
          />

          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
              className="px-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <Button
            onClick={mode === 'search' ? handleSearch : handleChat}
            disabled={!query.trim() || isSearching || chatLoading}
            className="rounded-full bg-[#d4a373] hover:bg-[#c49363] text-white px-4 py-2 mr-1"
          >
            {isSearching || chatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'search' ? (
              <Search className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 模式标签 */}
        <div className="flex items-center gap-1 mt-2 px-4">
          <span className="text-xs text-[#999]">
            {mode === 'search' ? '🔍 AI 语义搜索' : '✨ AI 对话推荐'}
          </span>
          <span className="text-xs text-[#ccc]">|</span>
          <button
            onClick={() => setMode(mode === 'search' ? 'chat' : 'search')}
            className="text-xs text-[#d4a373] hover:underline"
          >
            切换到{mode === 'search' ? '对话模式' : '搜索模式'}
          </button>
        </div>
      </div>

      {/* 搜索结果面板 */}
      <AnimatePresence>
        {showResults && mode === 'search' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#e8e3db] overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          >
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#d4a373]" />
                <span className="ml-2 text-sm text-[#666]">AI 正在理解你的意思...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs text-[#999] border-b border-[#f0ede8]">
                  找到 {results.length} 个相关结果
                </div>
                {results.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onResultClick?.(item);
                      setShowResults(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f9f7f3] transition-colors text-left"
                  >
                    <span className="text-xl">
                      {typeIcon[item.type] || typeIcon['location']}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#333] truncate">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-[#999] truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#d4a373]">
                      <span>{Math.round(item.similarity * 100)}%</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[#999]">
                未找到相关结果，试试换个描述？
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 对话面板 */}
      <AnimatePresence>
        {mode === 'chat' && chatMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#e8e3db] overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          >
            <div className="px-4 py-3 border-b border-[#f0ede8] flex items-center justify-between">
              <span className="text-sm font-medium text-[#333]">✨ AI 文化推荐助手</span>
              <button
                onClick={() => setChatMessages([])}
                className="text-xs text-[#999] hover:text-[#666]"
              >
                清除对话
              </button>
            </div>
            <div className="p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[#d4a373] text-white'
                        : 'bg-[#f9f7f3] text-[#333]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#f9f7f3] rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#d4a373]" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISearchBar;
