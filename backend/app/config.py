from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "BloodPing API"
    DATABASE_URL: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    
    # SMTP / Email Configuration (e.g. Gmail SMTP or any custom SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: str = "BloodPing"
    FRONTEND_URL: str = "https://bloodping.vercel.app"
    
    # Database Pool Configuration
    DB_POOL_MIN_CONN: int = 2
    DB_POOL_MAX_CONN: int = 20
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()

