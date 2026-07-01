from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_workflow"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    OPENAI_MODEL: str = "llama-3.3-70b-versatile"

    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""

    # File uploads directory (absolute path; created automatically at startup)
    UPLOADS_DIR: str = "/app/uploads"

    REDIS_URL: str = "redis://redis:6379/0"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
