from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.reports.services import ReportsService

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
