from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置，从环境变量加载"""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # Redis (可选)
    redis_url: str = "redis://localhost:6379/0"

    # Embedding 模型
    embedding_model: str = "shibing624/text2vec-base-chinese"
    embedding_dim: int = 768

    # LLM (用于对话式推荐)
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"

    # 服务配置
    cors_origins: list[str] = [
        "http://localhost:5666",
        "http://localhost:8080",
        "http://127.0.0.1:5666",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
