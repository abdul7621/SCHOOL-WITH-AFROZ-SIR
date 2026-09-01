import json
from typing import Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from sqlalchemy import select
from app.core.config import settings
from app.core.logging import logger
from app.core.redis import get_redis_client
from app.core.database import ControlAsyncSessionLocal
from app.core.exceptions import TenantNotFoundException, TenantSuspendedException
from app.control_plane.models import Tenant, TenantDomain, TenantStatus


class TenantResolverMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        host = request.headers.get("host", "").split(":")[0].lower()
        custom_tenant_slug = request.headers.get("x-tenant-slug")

        # 1. Health checks, docs, and Control Plane bypass
        if path.startswith("/health") or path.startswith("/docs") or path.startswith("/openapi.json") or path.startswith("/redoc"):
            return await call_next(request)

        if path.startswith(f"{settings.API_V1_PREFIX}/control") or host == settings.ADMIN_DOMAIN.lower():
            request.state.is_control_plane = True
            request.state.tenant_slug = None
            request.state.tenant_info = None
            return await call_next(request)

        request.state.is_control_plane = False

        # 2. Determine lookup domain or slug
        lookup_key = custom_tenant_slug if custom_tenant_slug else host

        # 3. Attempt Redis Cache Lookup
        redis = await get_redis_client()
        cached_data = None
        if redis:
            try:
                raw_cached = await redis.get(f"school:tenant_lookup:{lookup_key}")
                if raw_cached:
                    cached_data = json.loads(raw_cached)
            except Exception as e:
                logger.warning(f"Redis lookup failed for '{lookup_key}': {e}")

        tenant_info = cached_data

        # 4. Cache Miss: Query Control Database
        if not tenant_info:
            async with ControlAsyncSessionLocal() as control_session:
                if custom_tenant_slug:
                    stmt = select(Tenant).where(Tenant.slug == custom_tenant_slug)
                else:
                    stmt = select(Tenant).join(TenantDomain).where(TenantDomain.domain == host)

                result = await control_session.execute(stmt)
                tenant = result.scalar_one_or_none()

                if not tenant:
                    # Fallback for subdomains: e.g. 'sample.7aedu.com' -> slug = 'sample'
                    if "." in host and host.endswith(settings.PLATFORM_DOMAIN):
                        extracted_slug = host.split(".")[0]
                        stmt_fallback = select(Tenant).where(Tenant.slug == extracted_slug)
                        result_fallback = await control_session.execute(stmt_fallback)
                        tenant = result_fallback.scalar_one_or_none()

                if not tenant:
                    raise TenantNotFoundException(lookup_key)

                tenant_info = {
                    "id": tenant.id,
                    "slug": tenant.slug,
                    "school_name": tenant.school_name,
                    "db_name": tenant.db_name,
                    "db_user": tenant.db_user,
                    "db_password": tenant.db_password_encrypted,
                    "db_host": tenant.db_host,
                    "db_port": tenant.db_port,
                    "status": tenant.status,
                }

                # Store in Redis (1 Hour TTL)
                if redis:
                    try:
                        await redis.setex(f"school:tenant_lookup:{lookup_key}", 3600, json.dumps(tenant_info))
                    except Exception as e:
                        logger.warning(f"Failed to cache tenant info for '{lookup_key}': {e}")

        # 5. Check Tenant Status
        if tenant_info["status"] != TenantStatus.ACTIVE:
            raise TenantSuspendedException(tenant_info["slug"])

        # 6. Attach Tenant Metadata to Request State
        request.state.tenant_slug = tenant_info["slug"]
        request.state.tenant_info = tenant_info

        return await call_next(request)
