from zoneinfo import ZoneInfo
from datetime import datetime, date
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.settings.models import SystemSetting

DEFAULT_TIMEZONE = "Asia/Kolkata"


async def get_school_timezone(db: AsyncSession) -> ZoneInfo:
    """
    Retrieves the school's configured operational timezone from SystemSetting.
    Defaults to 'Asia/Kolkata' if not configured.
    """
    try:
        stmt = select(SystemSetting.setting_value).where(SystemSetting.setting_key == "school_timezone")
        res = await db.execute(stmt)
        val = res.scalar_one_or_none()
        if val:
            tz_str = val.strip('"') if isinstance(val, str) else str(val)
            return ZoneInfo(tz_str)
    except Exception:
        pass
    return ZoneInfo(DEFAULT_TIMEZONE)


async def get_school_today(db: AsyncSession) -> date:
    """
    Returns today's date adjusted to the school's configured operational timezone.
    """
    tz = await get_school_timezone(db)
    return datetime.now(tz).date()


async def get_school_now(db: AsyncSession) -> datetime:
    """
    Returns current datetime in the school's configured operational timezone.
    """
    tz = await get_school_timezone(db)
    return datetime.now(tz)
