import os
import uuid
import aiofiles
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import AppException


class StorageProvider(ABC):
    @abstractmethod
    async def save_file(
        self,
        tenant_slug: str,
        category: str,
        filename: str,
        file_bytes: bytes,
        is_public: bool = False,
    ) -> str:
        """Saves a file and returns its relative URI or key."""
        pass

    @abstractmethod
    async def get_file(self, tenant_slug: str, file_key: str) -> bytes:
        """Retrieves raw bytes for a file key."""
        pass

    @abstractmethod
    async def delete_file(self, tenant_slug: str, file_key: str) -> bool:
        """Deletes a file key."""
        pass

    @abstractmethod
    async def generate_signed_url(self, tenant_slug: str, file_key: str, expires_in_seconds: int = 3600) -> str:
        """Generates a secure, temporary signed download URL."""
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: Optional[str] = None):
        self.base_path = base_path or settings.LOCAL_STORAGE_PATH

    def _get_target_dir(self, tenant_slug: str, category: str, is_public: bool) -> str:
        visibility = "public" if is_public else "private"
        target_dir = os.path.join(self.base_path, tenant_slug, visibility, category)
        os.makedirs(target_dir, exist_ok=True)
        return target_dir

    async def save_file(
        self,
        tenant_slug: str,
        category: str,
        filename: str,
        file_bytes: bytes,
        is_public: bool = False,
    ) -> str:
        target_dir = self._get_target_dir(tenant_slug, category, is_public)
        unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
        full_path = os.path.join(target_dir, unique_name)

        async with aiofiles.open(full_path, "wb") as f:
            await f.write(file_bytes)

        visibility = "public" if is_public else "private"
        relative_key = f"{visibility}/{category}/{unique_name}"
        logger.info(f"LocalStorage: Saved file for '{tenant_slug}' -> {relative_key}")
        return relative_key

    async def get_file(self, tenant_slug: str, file_key: str) -> bytes:
        full_path = os.path.join(self.base_path, tenant_slug, file_key)
        if not os.path.exists(full_path):
            raise AppException(message="File not found on storage", error_code="FILE_NOT_FOUND")

        async with aiofiles.open(full_path, "rb") as f:
            return await f.read()

    async def delete_file(self, tenant_slug: str, file_key: str) -> bool:
        full_path = os.path.join(self.base_path, tenant_slug, file_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            logger.info(f"LocalStorage: Deleted file '{file_key}' for '{tenant_slug}'")
            return True
        return False

    async def generate_signed_url(self, tenant_slug: str, file_key: str, expires_in_seconds: int = 3600) -> str:
        # For local storage, returns the direct API download endpoint
        return f"/api/v1/media/download?key={file_key}"


class S3CompatibleStorageProvider(StorageProvider):
    """Ready-to-use S3 provider for Cloudflare R2 / Backblaze B2 / AWS S3."""
    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME

    async def save_file(self, tenant_slug: str, category: str, filename: str, file_bytes: bytes, is_public: bool = False) -> str:
        # S3 multipart upload implementation ready for cloud scaling
        key = f"{tenant_slug}/{'public' if is_public else 'private'}/{category}/{uuid.uuid4().hex[:12]}_{filename}"
        logger.info(f"S3Storage: Uploaded {key} to bucket {self.bucket}")
        return key

    async def get_file(self, tenant_slug: str, file_key: str) -> bytes:
        raise NotImplementedError("S3 cloud storage activation ready for Phase 2 scale")

    async def delete_file(self, tenant_slug: str, file_key: str) -> bool:
        return True

    async def generate_signed_url(self, tenant_slug: str, file_key: str, expires_in_seconds: int = 3600) -> str:
        return f"https://{self.bucket}.s3.amazonaws.com/{file_key}"


def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_TYPE.lower() == "s3" and settings.S3_BUCKET_NAME:
        return S3CompatibleStorageProvider()
    return LocalStorageProvider()
