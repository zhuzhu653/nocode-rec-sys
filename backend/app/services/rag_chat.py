"""RAG 对话式推荐服务"""
from openai import AsyncOpenAI
from app.config import get_settings
from app.services.embedding import get_embedding_service
from app.services.vector_store import get_vector_store

settings = get_settings()

SYSTEM_PROMPT = """你是"循踪觅意"文化探索平台的 AI 推荐助手。
你的任务是根据用户的需求，从候选内容中为他们推荐最合适的文化体验。

推荐风格要求：
- 像朋友聊天一样自然亲切
- 带有文艺气质和温度感
- 每条推荐附上一句推荐理由
- 如果用户的问题与文化/旅行/体验无关，礼貌引导回主题

平台覆盖城市：北京、上海、南京、杭州、西安、重庆
内容类型：文化空间(博物馆/画廊/书店/咖啡馆/公园/工坊)、手工体验课程、数字文创产品
"""


class RAGChatService:
    """RAG 对话式推荐"""

    def __init__(self):
        self.llm = AsyncOpenAI(
            api_key=settings.llm_api_key or "dummy",
            base_url=settings.llm_base_url,
        )
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()

    async def chat(
        self,
        user_message: str,
        history: list[dict] = None,
        user_id: str | None = None,
        city_id: int | None = None,
    ) -> tuple[str, list[dict]]:
        """
        对话式推荐
        返回: (AI 回复文本, 推荐的 Item 列表)
        """
        # 1. 从用户消息中检索相关内容
        query_vec = self.embedding_service.encode_query(user_message)
        relevant_items = self.vector_store.search(
            query_vec, top_k=5, city_id=city_id
        )

        # 2. 构建 context
        context = self._format_context(relevant_items)

        # 3. 构建消息列表
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if history:
            for msg in history[-6:]:  # 最近 3 轮对话
                messages.append({"role": msg["role"], "content": msg["content"]})

        user_prompt = f"{user_message}"
        if context:
            user_prompt += f"\n\n[可推荐的内容]\n{context}"

        messages.append({"role": "user", "content": user_prompt})

        # 4. 调用 LLM
        try:
            response = await self.llm.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                temperature=0.7,
                max_tokens=600,
            )
            reply = response.choices[0].message.content
        except Exception as e:
            # LLM 不可用时的 fallback
            reply = self._fallback_reply(user_message, relevant_items)

        return reply, relevant_items

    def _format_context(self, items: list[dict]) -> str:
        """将检索到的 Item 格式化为 context 文本"""
        if not items:
            return ""

        lines = []
        for i, item in enumerate(items, 1):
            name = item.get("name", "未知")
            desc = item.get("description", "")[:80]
            item_type = item.get("type", "")
            address = item.get("address", "")
            vibe = ", ".join(item.get("vibe", []) or [])

            line = f"{i}. {name}"
            if item_type:
                line += f" [{item_type}]"
            if desc:
                line += f" - {desc}"
            if address:
                line += f" | 地址: {address}"
            if vibe:
                line += f" | 氛围: {vibe}"
            lines.append(line)

        return "\n".join(lines)

    def _fallback_reply(self, query: str, items: list[dict]) -> str:
        """LLM 不可用时的 fallback"""
        if not items:
            return "抱歉，暂时没有找到相关推荐。你可以试试换个关键词描述你想要的体验~"

        reply = "为你找到了这些可能感兴趣的地方：\n\n"
        for i, item in enumerate(items[:3], 1):
            reply += f"{i}. **{item.get('name', '')}**"
            if item.get("description"):
                reply += f" — {item['description'][:50]}"
            reply += "\n"

        return reply


_chat_service: RAGChatService | None = None


def get_chat_service() -> RAGChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = RAGChatService()
    return _chat_service
