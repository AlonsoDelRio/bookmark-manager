
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    METADATA_FETCH_TIMEOUT: int = 10
    MAX_TAGS_PER_BOOKMARK: int = 10

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
