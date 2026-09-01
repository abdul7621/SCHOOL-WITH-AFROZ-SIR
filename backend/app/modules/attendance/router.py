from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission, CurrentTenantUser, get_current_user
from app.modules.attendance.schemas import SubmitAttendanceRequest
from app.modules.attendance.services import AttendanceService

router = APIRouter(prefix="/attendance", tags=["Daily Student Attendance"])


@router.get("/roster", dependencies=[Depends(RequirePermission("attendance:view"))])
async def get_attendance_roster(
    academic_year_id: str = Query(..., description="Academic Session ID"),
    class_id: str = Query(..., description="Class ID"),
    section_id: str = Query(..., description="Section ID"),
    attendance_date: date = Query(default_factory=date.today, description="Date for attendance"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Returns student roster for the specified class-section and date,
    including pre-marked statuses if attendance was already submitted.
    """
    roster = await AttendanceService.get_class_roster_for_date(
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        attendance_date=attendance_date,
        db=db,
    )
    return success_response(data=roster)


@router.post("/submit", dependencies=[Depends(RequirePermission("attendance:mark"))], status_code=status.HTTP_200_OK)
async def submit_daily_attendance(
    req: SubmitAttendanceRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Fast Grid Submission: Teacher/Staff submits bulk attendance for the class.
    Atomically inserts or updates records.
    """
    session = await AttendanceService.submit_attendance(
        req=req,
        marked_by_user_id=current_user.id,
        db=db,
    )
    return success_response(
        data={"session_id": session.id, "total_records": len(req.records)},
        message=f"Attendance submitted successfully for {req.attendance_date}",
    )


@router.get("/summary/daily", dependencies=[Depends(RequirePermission("attendance:view"))])
async def get_daily_attendance_summary(
    academic_year_id: str = Query(..., description="Academic Session ID"),
    attendance_date: date = Query(default_factory=date.today),
    class_id: Optional[str] = Query(None, description="Optional Class ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Returns overall school or class-wise attendance counts and percentage for dashboards."""
    summary = await AttendanceService.get_daily_summary(
        academic_year_id=academic_year_id,
        attendance_date=attendance_date,
        class_id=class_id,
        db=db,
    )
    return success_response(data=summary)
