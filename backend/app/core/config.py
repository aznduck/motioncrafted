"""
Configuration settings for the backend API
Loads environment variables and provides typed settings
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Supabase Database
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_STORAGE_BUCKET: str = "cherished-motion-videos"

    # External APIs
    OPENAI_API_KEY: str
    KLING_API_KEY: str  # Kling Access Key
    KLING_SECRET_KEY: str  # Kling Secret Key
    KLING_API_URL: str = "https://api-singapore.klingai.com/v1"

    # JWT Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Admin Seed User
    ADMIN_EMAIL: str = "dhan6663@usc.edu"
    ADMIN_PASSWORD: str = "changeme123"

    # CORS Origins
    CUSTOMER_SITE_URL: str = "http://localhost:3000"
    ADMIN_SITE_URL: str = "http://localhost:3001"

    # Stripe Payment
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_PRICE_PER_PHOTO: float = 5.0  # $5 per photo

    # Email Service
    RESEND_API_KEY: str

    # Application Settings
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "production"  # development, production

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT.lower() == "production" or not self.DEBUG


# Create settings instance
settings = Settings()