from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.settings.models import SystemSetting
from app.modules.notifications.models import NotificationLog, NotificationSetting
from app.modules.notifications.schemas import (
    SendNotificationRequest,
    NotificationSettingUpdate,
    NotificationLogResponse,
)
from app.modules.notifications.services import NotificationDispatcher

router = APIRouter(prefix="/notifications", tags=["Multi-Channel Notifications Engine"])


@router.get("/logs", dependencies=[Depends(RequirePermission("notifications:view"))])
async def get_notification_logs(
    channel: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves delivery audit logs for WhatsApp, SMS, and Email dispatches."""
    stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(limit)
    if channel:
        stmt = stmt.where(NotificationLog.channel == channel)

    res = await db.execute(stmt)
    logs = res.scalars().all()
    return success_response(data=[NotificationLogResponse.model_validate(l).model_dump() for l in logs])


@router.post("/send-direct", dependencies=[Depends(RequirePermission("notifications:send"))])
async def send_direct_notification(
    req: SendNotificationRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Dispatches a direct SMS / WhatsApp alert to a parent."""
    settings_res = await db.execute(select(SystemSetting).where(SystemSetting.setting_key == "school_name"))
    setting = settings_res.scalar_one_or_none()
    school_name = setting.setting_value.strip('"') if setting else "7A Model School"

    log = await NotificationDispatcher.dispatch_absenteeism_alert(
        student_name=req.student_name,
        parent_phone=req.recipient_phone,
        attendance_date=date.today(),
        school_name=school_name,
        db=db,
    )
    return success_response(data={"log_id": log.id, "status": log.status}, message="Notification dispatched successfully.")
