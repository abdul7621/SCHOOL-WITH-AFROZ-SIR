import json
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger

redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB_INDEX,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            await redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory/direct DB operation.")
            redis_client = None
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


class TenantCacheService:
    @staticmethod
    def _make_key(tenant_slug: str, namespace: str, key: str) -> str:
        return f"school:{tenant_slug}:{namespace}:{key}"

    @classmethod
    async def get_json(cls, tenant_slug: str, namespace: str, key: str) -> Optional[Any]:
        client = await get_redis_client()
        if not client:
            return None
        try:
            full_key = cls._make_key(tenant_slug, namespace, key)
            val = await client.get(full_key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Redis get_json error for key {key}: {e}")
        return None

    @classmethod
    async def set_json(cls, tenant_slug: str, namespace: str, key: str, value: Any, ttl_seconds: int = 3600):
        client = await get_redis_client()
        if not client:
            return
        try:
            full_key = cls._make_key(tenant_slug, namespace, key)
            await client.setex(full_key, ttl_seconds, json.dumps(value))
        except Exception as e:
            logger.warning(f"Redis set_json error for key {key}: {e}")

    @classmethod
    async def delete(cls, tenant_slug: str, namespace: str, key: str):
        client = await get_redis_client()
        if not client:
            return
        try:
            full_key = cls._make_key(tenant_slug, namespace, key)
            await client.delete(full_key)
        except Exception as e:
            logger.warning(f"Redis delete error for key {key}: {e}")
