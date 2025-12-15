"""
Database connection and client setup
Handles Supabase PostgreSQL connection
"""

from supabase import create_client, Client
from app.core.config import settings
from typing import Optional


class Database:
    """Database connection manager"""

    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client"""
        if cls._client is None:
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return cls._client

    @classmethod
    def close(cls):
        """Close database connection"""
        if cls._client is not None:
            # Supabase client doesn't need explicit closing
            cls._client = None


# Convenience function to get database client
def get_db() -> Client:
    """Get database client instance"""
    return Database.get_client()
