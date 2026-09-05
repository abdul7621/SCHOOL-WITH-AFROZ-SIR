import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "7A School ERP SaaS Engine"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PLATFORM_DOMAIN: str = "7aedu.com"
    ADMIN_DOMAIN: str = "admin.7aedu.com"
    API_V1_PREFIX: str = "/api/v1"

    # Control Database Configuration
    CONTROL_DB_HOST: str = "127.0.0.1"
    CONTROL_DB_PORT: int = 3306
    CONTROL_DB_USER: str = "root"
    CONTROL_DB_PASSWORD: str = "root"
    CONTROL_DB_NAME: str = "saas_control_db"
    INITIAL_SUPER_ADMIN_EMAIL: str = "superadmin@7aedu.com"
    INITIAL_SUPER_ADMIN_PASSWORD: str = "AdminSecurePassword123!"
    INITIAL_SUPER_ADMIN_NAME: str = "Platform Super Admin"

    # Default MySQL Root/Admin for Tenant Provisioning
    TENANT_MYSQL_HOST: str = "127.0.0.1"
    TENANT_MYSQL_PORT: int = 3306
    TENANT_MYSQL_ADMIN_USER: str = "root"
    TENANT_MYSQL_ADMIN_PASSWORD: str = "root"

    # Redis Configuration
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379
    REDIS_DB_INDEX: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # Security & JWT
    JWT_SECRET_KEY: str = "insecure_dev_secret_key_change_in_production_7aedu_saas_platform_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage Configuration
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    LOCAL_STORAGE_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "tenants")
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION_NAME: str = "auto"

    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/0"

    # Control DB Async URI
    @property
    def CONTROL_DB_ASYNC_URI(self) -> str:
        return f"mysql+asyncmy://{self.CONTROL_DB_USER}:{self.CONTROL_DB_PASSWORD}@{self.CONTROL_DB_HOST}:{self.CONTROL_DB_PORT}/{self.CONTROL_DB_NAME}?charset=utf8mb4"

    # Control DB Sync URI (Used by Alembic and sync tools)
    @property
    def CONTROL_DB_SYNC_URI(self) -> str:
        return f"mysql+pymysql://{self.CONTROL_DB_USER}:{self.CONTROL_DB_PASSWORD}@{self.CONTROL_DB_HOST}:{self.CONTROL_DB_PORT}/{self.CONTROL_DB_NAME}?charset=utf8mb4"

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
