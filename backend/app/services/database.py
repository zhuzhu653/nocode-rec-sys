"""Supabase 数据库服务"""
from supabase import create_client, Client
from app.config import get_settings

settings = get_settings()

_client: Client | None = None


def get_supabase() -> Client:
    """获取 Supabase 客户端单例"""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _client


async def get_locations(city_id: int | None = None, category: str | None = None) -> list[dict]:
    """获取城市文化地点"""
    client = get_supabase()
    query = client.table("city_locations").select("*")

    if city_id:
        query = query.eq("city_id", city_id)
    if category:
        query = query.eq("type", category)

    result = query.execute()
    return result.data


async def search_locations_keyword(keyword: str, city_id: int | None = None) -> list[dict]:
    """关键词搜索地点 (ILIKE)"""
    client = get_supabase()
    query = client.table("city_locations").select("*").ilike("name", f"%{keyword}%")

    if city_id:
        query = query.eq("city_id", city_id)

    result = query.execute()
    return result.data


async def get_all_items_for_embedding() -> list[dict]:
    """获取所有需要生成 embedding 的数据"""
    client = get_supabase()

    # 获取所有地点
    locations = client.table("city_locations").select("*").execute().data

    # 获取所有产品
    products = client.table("digital_products").select("*").eq("is_active", True).execute().data

    # 合并并标记类型
    items = []
    for loc in locations:
        loc["item_type"] = "location"
        items.append(loc)
    for prod in products:
        prod["item_type"] = "product"
        items.append(prod)

    return items


async def log_behavior_events(events: list[dict]):
    """记录用户行为事件到数据库"""
    client = get_supabase()
    # 批量插入行为日志
    if events:
        client.table("user_behavior_events").insert(events).execute()
