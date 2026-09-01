from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission, CurrentTenantUser, get_current_user
from app.modules.fees.models import (
    FeeHead,
    FeeStructure,
    FeeInstallmentSchedule,
    FeeConcessionType,
    StudentFeeConcession,
    FeeCollection,
    FeeCollectionItem,
)
from app.modules.fees.schemas import (
    FeeHeadCreate,
    FeeStructureCreate,
    FeeInstallmentScheduleCreate,
    FeeConcessionTypeCreate,
    AssignStudentConcessionRequest,
    GenerateBulkFeeDemandsRequest,
    CollectFeePaymentRequest,
    ReverseFeeReceiptRequest,
)
from app.modules.fees.services import FeeService

router = APIRouter(prefix="/fees", tags=["Penny-Perfect Fee Engine"])


# ==========================================
# 1. Fee Heads
# ==========================================
@router.get("/heads", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_fee_heads(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all configurable fee heads ordered by allocation priority."""
    stmt = select(FeeHead).order_by(FeeHead.priority_order.asc())
    result = await db.execute(stmt)
    heads = result.scalars().all()
    return success_response(
        data=[
            {
                "id": h.id,
                "name": h.name,
                "code": h.code,
                "is_recurring": h.is_recurring,
                "priority_order": h.priority_order,
                "description": h.description,
            }
            for h in heads
        ]
    )


@router.post("/heads", dependencies=[Depends(RequirePermission("fees:view"))], status_code=status.HTTP_201_CREATED)
async def create_fee_head(req: FeeHeadCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new fee head (e.g. Tuition, Transport, Annual Development)."""
    head = FeeHead(
        name=req.name,
        code=req.code.upper(),
        is_recurring=req.is_recurring,
        priority_order=req.priority_order,
        description=req.description,
    )
    db.add(head)
    await db.commit()
    await db.refresh(head)
    return success_response(data={"id": head.id, "name": head.name}, message="Fee head created successfully")


# ==========================================
# 2. Fee Structures & Installments
# ==========================================
@router.post("/structures", dependencies=[Depends(RequirePermission("fees:view"))], status_code=status.HTTP_201_CREATED)
async def create_fee_structure(req: FeeStructureCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates or updates class-wise fee structure."""
    structure = await FeeService.create_fee_structure(req, db)
    return success_response(
        data={"id": structure.id, "name": structure.name, "total_annual_amount": float(structure.total_annual_amount)},
        message=f"Fee structure '{structure.name}' configured successfully",
    )


@router.post("/schedules", dependencies=[Depends(RequirePermission("fees:view"))], status_code=status.HTTP_201_CREATED)
async def create_installment_schedule(req: FeeInstallmentScheduleCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates installment collection schedule (e.g. April 2026, Q1)."""
    sched = FeeInstallmentSchedule(
        academic_year_id=req.academic_year_id,
        name=req.name,
        installment_month=req.installment_month,
        due_date=req.due_date,
        grace_period_days=req.grace_period_days,
        late_fine_rate_per_day=req.late_fine_rate_per_day,
    )
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return success_response(data={"id": sched.id, "name": sched.name}, message="Schedule created")


# ==========================================
# 3. Concessions & Bulk Demands
# ==========================================
@router.post("/concessions/types", dependencies=[Depends(RequirePermission("fees:view"))])
async def create_concession_type(req: FeeConcessionTypeCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates concession discount rule (e.g. Sibling 20%, Staff Child 50%)."""
    conc = FeeConcessionType(
        name=req.name,
        discount_type=req.discount_type,
        discount_value=req.discount_value,
        description=req.description,
    )
    db.add(conc)
    await db.commit()
    await db.refresh(conc)
    return success_response(data={"id": conc.id, "name": conc.name}, message="Concession type created")


@router.post("/concessions/assign", dependencies=[Depends(RequirePermission("fees:view"))])
async def assign_student_concession(
    req: AssignStudentConcessionRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Assigns approved discount concession to a student."""
    concession = StudentFeeConcession(
        student_id=req.student_id,
        academic_year_id=req.academic_year_id,
        concession_type_id=req.concession_type_id,
        fee_head_id=req.fee_head_id,
        approved_by_user_id=current_user.id,
        reason=req.reason,
    )
    db.add(concession)
    await db.commit()
    return success_response(message="Concession assigned to student successfully")


@router.post("/demands/generate-bulk", dependencies=[Depends(RequirePermission("fees:view"))])
async def generate_bulk_demands(req: GenerateBulkFeeDemandsRequest, db: AsyncSession = Depends(get_tenant_db)):
    """Bulk Demand Generator: Creates individual fee invoices for all active students."""
    count = await FeeService.generate_bulk_fee_demands(req, db)
    return success_response(
        data={"demands_generated": count},
        message=f"Generated {count} student fee demands successfully",
    )


# ==========================================
# 4. Penny-Perfect Fee Collection & Reversal
# ==========================================
@router.post("/collect", dependencies=[Depends(RequirePermission("fees:collect"))], status_code=status.HTTP_201_CREATED)
async def collect_fee_payment(
    req: CollectFeePaymentRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Penny-Perfect Cashier Collection: Receives payment and automatically executes
    FIFO ledger allocation to clear pending fee demands down to zero.
    """
    collection = await FeeService.collect_fee_payment(
        req=req,
        cashier_user_id=current_user.id,
        db=db,
    )
    return success_response(
        data={
            "id": collection.id,
            "receipt_no": collection.receipt_no,
            "total_amount_paid": float(collection.total_amount_paid),
            "collection_date": str(collection.collection_date),
            "status": collection.status,
        },
        message=f"Payment received successfully. Receipt No: {collection.receipt_no}",
    )


@router.post("/receipts/{receipt_no}/reverse", dependencies=[Depends(RequirePermission("fees:reverse"))])
async def reverse_fee_receipt(
    receipt_no: str,
    req: ReverseFeeReceiptRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Zero-Destructive Deletion: Reverses a confirmed fee receipt, restores
    the unpaid demands on student ledger, and flags receipt as REVERSED.
    """
    collection = await FeeService.reverse_fee_receipt(
        receipt_no=receipt_no,
        reversal_reason=req.reversal_reason,
        user_id=current_user.id,
        db=db,
    )
    return success_response(
        data={"receipt_no": collection.receipt_no, "status": collection.status},
        message=f"Receipt '{collection.receipt_no}' reversed successfully. Demands restored.",
    )


@router.get("/ledger/{student_id}", dependencies=[Depends(RequirePermission("fees:view"))])
async def get_student_fee_ledger(
    student_id: str,
    academic_year_id: str = Query(..., description="Academic Session ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves full student statement of account / fee ledger with all demands and payments."""
    ledger = await FeeService.get_student_ledger(
        student_id=student_id,
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(data=ledger)
