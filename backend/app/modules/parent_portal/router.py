from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_db
from app.shared.responses import success_response
from app.middlewares.auth_middleware import get_current_user, CurrentTenantUser
from app.modules.fees.services import FeeService
from app.modules.exams.services import ExamService
from app.modules.parent_portal.services import ParentPortalService

router = APIRouter(prefix="/parent", tags=["Parent Portal (Mobile & PWA)"])


@router.get("/children")
async def get_my_children(
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Action: Retrieves list of children linked to this parent account (Multi-Child Switcher)."""
    children = await ParentPortalService.get_parent_children(current_user.id, db)
    return success_response(data=children)


@router.get("/children/{student_id}/overview")
async def get_child_dashboard_overview(
    student_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Dashboard: Returns today's attendance, pending fee dues, and recent behavioral ratings."""
    overview = await ParentPortalService.get_child_overview(
        parent_user_id=current_user.id,
        student_id=student_id,
        db=db,
    )
    return success_response(data=overview)


@router.get("/children/{student_id}/attendance")
async def get_child_monthly_attendance(
    student_id: str,
    month: int = Query(default_factory=lambda: date.today().month, ge=1, le=12),
    year: int = Query(default_factory=lambda: date.today().year, ge=2020, le=2050),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Action: Returns calendar attendance matrix for selected month and year."""
    data = await ParentPortalService.get_child_attendance(
        parent_user_id=current_user.id,
        student_id=student_id,
        month=month,
        year=year,
        db=db,
    )
    return success_response(data=data)


@router.get("/children/{student_id}/fees")
async def get_child_fee_ledger(
    student_id: str,
    academic_year_id: str = Query(...),
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Action: Full Statement of Account showing fee demands, concessions, and paid receipts."""
    await ParentPortalService._verify_parent_access(current_user.id, student_id, db)
    ledger = await FeeService.get_student_ledger(
        student_id=student_id,
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(data=ledger)


@router.get("/children/{student_id}/report-cards/{term_id}")
async def get_child_term_report_card(
    student_id: str,
    term_id: str,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Action: View published report card for the student."""
    await ParentPortalService._verify_parent_access(current_user.id, student_id, db)
    report = await ExamService.compile_student_term_report(
        exam_term_id=term_id,
        student_id=student_id,
        db=db,
    )
    return success_response(data=report)
