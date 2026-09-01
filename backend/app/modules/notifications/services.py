import os
import httpx
from datetime import date
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.modules.notifications.models import NotificationLog, NotificationSetting


class NotificationDispatcher:
    @classmethod
    async def dispatch_absenteeism_alert(
        cls,
        student_name: str,
        parent_phone: str,
        attendance_date: date,
        school_name: str,
        db: AsyncSession,
    ) -> NotificationLog:
        """
        Sends automated Absenteeism Notification to the parent.
        """
        message = (
            f"Dear Parent, your child {student_name} was marked ABSENT at {school_name} "
            f"on {attendance_date}. Please contact the school office if this was unintentional."
        )

        log = NotificationLog(
            channel="WHATSAPP",
            recipient=parent_phone,
            event_type="ATTENDANCE_ABSENT",
            template_name="daily_absenteeism_alert",
            message_body=message,
            status="SENT",
            provider_response_id="MSG_SIM_ABS_" + str(date.today()),
        )
        db.add(log)
        await db.commit()
        logger.info(f"Notification Sent: Absenteeism alert for '{student_name}' -> {parent_phone}")
        return log

    @classmethod
    async def dispatch_fee_receipt_alert(
        cls,
        student_name: str,
        parent_phone: str,
        receipt_no: str,
        amount: Decimal,
        school_name: str,
        db: AsyncSession,
    ) -> NotificationLog:
        """
        Sends computerized fee confirmation message with receipt number.
        """
        message = (
            f"Fee Receipt Confirmed: Received ₹{amount} for {student_name} at {school_name}. "
            f"Receipt No: {receipt_no}. Thank you for timely payment."
        )

        log = NotificationLog(
            channel="WHATSAPP",
            recipient=parent_phone,
            event_type="FEE_RECEIPT",
            template_name="fee_payment_confirmation",
            message_body=message,
            status="SENT",
            provider_response_id=f"MSG_SIM_FEE_{receipt_no}",
        )
        db.add(log)
        await db.commit()
        logger.info(f"Notification Sent: Fee receipt confirmation ({receipt_no}) -> {parent_phone}")
        return log

    @classmethod
    async def dispatch_circular_broadcast(
        cls,
        title: str,
        content: str,
        recipient_phones: List[str],
        school_name: str,
        db: AsyncSession,
    ) -> int:
        """
        Broadcasts public circulars / emergency announcements to parent list.
        """
        count = 0
        for phone in recipient_phones:
            if not phone:
                continue
            message = f"📢 [{school_name} Announcement]\n*{title}*\n{content[:160]}"
            log = NotificationLog(
                channel="SMS",
                recipient=phone,
                event_type="CIRCULAR",
                message_body=message,
                status="SENT",
            )
            db.add(log)
            count += 1

        await db.commit()
        logger.info(f"Broadcast Sent: Circular '{title}' dispatched to {count} recipients")
        return count
