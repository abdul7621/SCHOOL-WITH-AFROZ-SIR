from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_db
from app.core.redis import TenantCacheService
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.settings.models import SystemSetting
from app.modules.settings.schemas import SystemSettingUpdate, SystemSettingResponse

router = APIRouter(prefix="/settings", tags=["Dynamic System Settings"])


@router.get("/public")
async def get_public_tenant_settings(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Public Endpoint: Fetches branding, colors, logos, and theme configurations
    for public school website and staff login screen. Cached in Redis.
    """
    tenant_slug = getattr(request.state, "tenant_slug", "unknown")

    # Try Redis Cache first
    cached_settings = await TenantCacheService.get_json(tenant_slug, "settings", "public")
    if cached_settings:
        return success_response(data=cached_settings, message="Public settings retrieved from cache")

    # DB Fetch
    stmt = select(SystemSetting).where(SystemSetting.is_public == True)
    result = await db.execute(stmt)
    settings_records = result.scalars().all()

    settings_dict = {s.setting_key: s.setting_value for s in settings_records}

    # Store in Redis (1 Hour TTL)
    await TenantCacheService.set_json(tenant_slug, "settings", "public", settings_dict, ttl_seconds=3600)

    return success_response(data=settings_dict, message="Public settings retrieved successfully")


@router.get("", dependencies=[Depends(RequirePermission("settings:manage"))])
async def get_all_tenant_settings(db: AsyncSession = Depends(get_tenant_db)):
    """Admin Endpoint: Returns all internal system settings for the active school."""
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    settings_records = result.scalars().all()

    return success_response(
        data=[
            {
                "id": s.id,
                "key": s.setting_key,
                "value": s.setting_value,
                "is_public": s.is_public,
                "description": s.description,
            }
            for s in settings_records
        ]
    )


@router.post("", dependencies=[Depends(RequirePermission("settings:manage"))])
async def set_tenant_setting(
    req: SystemSettingUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Admin Endpoint: Creates or updates a school setting and invalidates Redis cache."""
    tenant_slug = getattr(request.state, "tenant_slug", "unknown")

    stmt = select(SystemSetting).where(SystemSetting.setting_key == req.setting_key)
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()

    if setting:
        setting.setting_value = req.setting_value
        setting.is_public = req.is_public
        if req.description:
            setting.description = req.description
    else:
        setting = SystemSetting(
            setting_key=req.setting_key,
            setting_value=req.setting_value,
            is_public=req.is_public,
            description=req.description,
        )
        db.add(setting)

    await db.commit()
    await db.refresh(setting)

    # Invalidate public settings cache
    await TenantCacheService.delete(tenant_slug, "settings", "public")

    return success_response(
        data={"key": setting.setting_key, "value": setting.setting_value, "is_public": setting.is_public},
        message=f"Setting '{setting.setting_key}' saved and cache synchronized",
    )
