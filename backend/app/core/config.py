from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"

    ADZUNA_APP_ID: str
    ADZUNA_APP_KEY: str

    JSEARCH_API_KEY: str

    ANTHROPIC_API_KEY: str
    VOYAGE_API_KEY: str
    GMAIL_USER: str
    GMAIL_APP_PASSWORD: str

    class Config:
        env_file = "/home/ahmadavar/projects/jobradar/.env"


settings = Settings()
