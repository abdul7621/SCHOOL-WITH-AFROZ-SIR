from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission, get_current_user, CurrentTenantUser
from app.modules.reports.services import ReportsService

class FeeFollowupCreateRequest(BaseModel):
    contacted_phone: Optional[str] = None
    promise_date: Optional[date] = None
    promised_amount: Optional[float] = None
    outcome: str = "PROMISED"
    notes: Optional[str] = None

router = APIRouter(prefix="/reports", tags=["Consolidated Reporting Engine"])


@router.get("/fees/collections", dependencies=[Depends(RequirePermission("fees:view_reports"))])
async def get_fee_collections_report(
    from_date: date = Query(default_factory=lambda: date.today().replace(day=1)),
    to_date: date = Query(default_factory=lambda: date.today()),
    payment_mode_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Generates daily/monthly fee collection register with cashier attribution."""
    report = await ReportsService.get_fee_collection_register(
        from_date=from_date,
        to_date=to_date,
        payment_mode_id=payment_mode_id,
        db=db,
    )
    return success_response(data=report)


@router.get("/fees/defaulters", dependencies=[Depends(RequirePermission("fees:view_reports"))])
async def get_fee_defaulters_report(
    academic_year_id: str = Query(...),
    class_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists all students with pending/overdue balance amounts sorted highest first."""
    report = await ReportsService.get_fee_defaulters_list(
        academic_year_id=academic_year_id,
        class_id=class_id,
        db=db,
    )
    return success_response(data=report)


@router.post("/fees/defaulters/{student_id}/followup", dependencies=[Depends(RequirePermission("fees:collect"))])
async def record_fee_defaulter_followup(
    student_id: str,
    req: FeeFollowupCreateRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Cashier/Admin Action: Records a fee recovery call outcome or Promise-to-Pay (PTP)."""
    from app.modules.fees.models import StudentFeeFollowup
    from app.modules.students.models import Student

    st = (await db.execute(select(Student.id).where(Student.id == student_id))).scalar_one_or_none()
    if not st:
        raise ResourceNotFoundException("Student", student_id)

    fup = StudentFeeFollowup(
        student_id=student_id,
        contacted_phone=req.contacted_phone,
        followup_date=date.today(),
        promise_date=req.promise_date,
        promised_amount=req.promised_amount,
        outcome=req.outcome.upper(),
        notes=req.notes.strip() if req.notes else None,
        recorded_by_user_id=current_user.id,
    )
    db.add(fup)
    await db.commit()
    await db.refresh(fup)
    return success_response(data={"id": fup.id, "outcome": fup.outcome}, message="Call follow-up logged successfully.")


@router.get("/fees/defaulters/{student_id}/followups", dependencies=[Depends(RequirePermission("fees:view_reports"))])
async def list_fee_defaulter_followups(
    student_id: str,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves full call and promise-to-pay history for a student."""
    from app.modules.fees.models import StudentFeeFollowup
    from app.modules.users_rbac.models import User
    from app.modules.staff.models import StaffProfile

    stmt = (
        select(StudentFeeFollowup, User, StaffProfile)
        .join(User, StudentFeeFollowup.recorded_by_user_id == User.id)
        .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
        .where(StudentFeeFollowup.student_id == student_id)
        .order_by(StudentFeeFollowup.followup_date.desc(), StudentFeeFollowup.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for fup, usr, stf in rows:
        name = f"{stf.first_name} {stf.last_name or ''}".strip() if stf else usr.username
        items.append({
            "id": fup.id,
            "followup_date": str(fup.followup_date),
            "promise_date": str(fup.promise_date) if fup.promise_date else None,
            "promised_amount": float(fup.promised_amount) if fup.promised_amount else None,
            "outcome": fup.outcome,
            "notes": fup.notes,
            "contacted_phone": fup.contacted_phone,
            "recorded_by": name,
            "created_at": str(fup.created_at),
        })

    return success_response(data=items)


@router.get("/attendance/matrix", dependencies=[Depends(RequirePermission("attendance:view"))])
async def get_attendance_matrix_report(
    academic_year_id: str = Query(...),
    class_id: str = Query(...),
    section_id: str = Query(...),
    month: int = Query(default_factory=lambda: date.today().month, ge=1, le=12),
    year: int = Query(default_factory=lambda: date.today().year, ge=2020, le=2050),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Generates month-wide attendance register grid for an entire section."""
    report = await ReportsService.get_monthly_attendance_matrix(
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        month=month,
        year=year,
        db=db,
    )
    return success_response(data=report)


@router.get("/finance/income-expense", dependencies=[Depends(RequirePermission("finance:view"))])
async def get_income_expense_statement(
    month: int = Query(default_factory=lambda: date.today().month, ge=1, le=12),
    year: int = Query(default_factory=lambda: date.today().year, ge=2020, le=2050),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Monthly Income vs Expense Financial Statement."""
    report = await ReportsService.get_monthly_income_expense_statement(
        month=month,
        year=year,
        db=db,
    )
    return success_response(data=report)


@router.get("/dashboard/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_tenant_db)):
    """
    Role-tailored live aggregate metrics for Principal, Admin, Teacher, and Cashier dashboards.
    Zero mock data — computed live from database.
    """
    stats = await ReportsService.get_dashboard_summary(db=db)
    return success_response(data=stats)
