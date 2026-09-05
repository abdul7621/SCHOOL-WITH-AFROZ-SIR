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
    FeeStructureItem,
    FeeInstallmentSchedule,
    FeeConcessionType,
    StudentFeeConcession,
    StudentFeeDemand,
    FeeCollection,
    FeeCollectionItem,
    FeeRefund,
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
    FeeRefundCreate,
    FeeRefundResponse,
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


@router.get("/structures", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_fee_structures(academic_year_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_tenant_db)):
    """Lists configured class fee structures."""
    stmt = (
        select(FeeStructure)
        .options(selectinload(FeeStructure.class_level), selectinload(FeeStructure.items).selectinload(FeeStructureItem.fee_head))
    )
    if academic_year_id:
        stmt = stmt.where(FeeStructure.academic_year_id == academic_year_id)
    res = await db.execute(stmt)
    structures = res.scalars().all()
    return success_response(
        data=[
            {
                "id": s.id,
                "name": s.name,
                "class_id": s.class_id,
                "class_name": s.class_level.name if s.class_level else "Class",
                "academic_year_id": s.academic_year_id,
                "total_annual_amount": float(s.total_annual_amount),
                "items": [
                    {
                        "id": i.id,
                        "head_name": i.fee_head.name if i.fee_head else "Head",
                        "amount": float(i.amount),
                        "frequency": i.frequency,
                    }
                    for i in s.items
                ],
            }
            for s in structures
        ]
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


@router.get("/schedules", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_installment_schedules(academic_year_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_tenant_db)):
    """Lists installment schedules."""
    stmt = select(FeeInstallmentSchedule).order_by(FeeInstallmentSchedule.due_date.asc())
    if academic_year_id:
        stmt = stmt.where(FeeInstallmentSchedule.academic_year_id == academic_year_id)
    res = await db.execute(stmt)
    schedules = res.scalars().all()
    return success_response(
        data=[
            {
                "id": sc.id,
                "name": sc.name,
                "installment_month": sc.installment_month,
                "due_date": str(sc.due_date),
                "grace_period_days": sc.grace_period_days,
                "late_fine_rate_per_day": float(sc.late_fine_rate_per_day),
            }
            for sc in schedules
        ]
    )


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


@router.get("/concessions/types", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_concession_types(db: AsyncSession = Depends(get_tenant_db)):
    """Lists concession discount rules."""
    stmt = select(FeeConcessionType).order_by(FeeConcessionType.name.asc())
    res = await db.execute(stmt)
    types = res.scalars().all()
    return success_response(
        data=[
            {
                "id": t.id,
                "name": t.name,
                "discount_type": t.discount_type,
                "discount_value": float(t.discount_value),
                "description": t.description,
            }
            for t in types
        ]
    )


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


@router.get("/concessions", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_student_concessions(academic_year_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_tenant_db)):
    """Lists all approved student fee concessions."""
    stmt = (
        select(StudentFeeConcession)
        .options(
            selectinload(StudentFeeConcession.student),
            selectinload(StudentFeeConcession.concession_type),
            selectinload(StudentFeeConcession.fee_head),
        )
        .order_by(StudentFeeConcession.created_at.desc())
    )
    if academic_year_id:
        stmt = stmt.where(StudentFeeConcession.academic_year_id == academic_year_id)
    res = await db.execute(stmt)
    concessions = res.scalars().all()
    return success_response(
        data=[
            {
                "id": c.id,
                "student_id": c.student_id,
                "student_name": f"{c.student.first_name} {c.student.last_name or ''}".strip() if c.student else "Student",
                "admission_no": c.student.admission_no if c.student else "-",
                "concession_type_name": c.concession_type.name if c.concession_type else "Concession",
                "discount_type": c.concession_type.discount_type if c.concession_type else "PERCENTAGE",
                "discount_value": float(c.concession_type.discount_value) if c.concession_type else 0.0,
                "fee_head_name": c.fee_head.name if c.fee_head else "All Heads",
                "reason": c.reason,
            }
            for c in concessions
        ]
    )


@router.get("/register", dependencies=[Depends(RequirePermission("fees:view"))])
async def get_class_fee_register(
    academic_year_id: str = Query(...),
    class_id: str = Query(...),
    section_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Class Fee Register (Document 3, Section 12):
    Class & Section summary of all students with Total Fee, Paid, Concession, Fine, and Outstanding Balance.
    """
    from app.modules.students.models import Student, StudentEnrollment
    stmt = (
        select(Student, StudentEnrollment)
        .join(StudentEnrollment, Student.id == StudentEnrollment.student_id)
        .where(
            StudentEnrollment.academic_year_id == academic_year_id,
            StudentEnrollment.class_id == class_id,
            StudentEnrollment.is_active == True,
        )
    )
    if section_id:
        stmt = stmt.where(StudentEnrollment.section_id == section_id)

    st_res = await db.execute(stmt)
    students = st_res.all()

    register_rows = []
    for student, enroll in students:
        d_stmt = select(StudentFeeDemand).where(
            StudentFeeDemand.student_id == student.id,
            StudentFeeDemand.academic_year_id == academic_year_id,
        )
        d_res = await db.execute(d_stmt)
        demands = d_res.scalars().all()

        total_base = sum(float(d.base_amount) for d in demands)
        total_conc = sum(float(d.concession_amount) for d in demands)
        total_fine = sum(float(d.fine_amount) for d in demands)
        total_net = sum(float(d.net_demand_amount) for d in demands)
        total_paid = sum(float(d.paid_amount) for d in demands)
        total_bal = sum(float(d.balance_amount) for d in demands)

        register_rows.append({
            "student_id": student.id,
            "admission_no": student.admission_no,
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "roll_no": enroll.roll_no,
            "total_fee": total_base,
            "concession": total_conc,
            "fine": total_fine,
            "net_demand": total_net,
            "paid": total_paid,
            "balance": total_bal,
            "status": "CLEAR" if total_bal <= 0 and total_net > 0 else ("UNPAID" if total_paid == 0 else "PARTIAL"),
        })

    return success_response(data=register_rows)


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


# ==========================================
# 5. Fee Refund Management (PDF 3, Sec 10)
# ==========================================
@router.post("/refunds", dependencies=[Depends(RequirePermission("fees:collect"))], status_code=status.HTTP_201_CREATED)
async def process_fee_refund(
    req: FeeRefundCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Records a student fee refund, preserving original collection receipt
    history and logging audit authorization.
    """
    refund = await FeeService.process_fee_refund(
        student_id=req.student_id,
        refund_amount=req.refund_amount,
        payment_mode_id=req.payment_mode_id,
        reason=req.reason,
        user_id=current_user.id,
        fee_collection_id=req.fee_collection_id,
        refund_date=req.refund_date,
        db=db,
    )
    return success_response(
        data={
            "id": refund.id,
            "refund_no": refund.refund_no,
            "refund_amount": float(refund.refund_amount),
            "refund_date": str(refund.refund_date),
        },
        message=f"Fee refund '{refund.refund_no}' processed successfully",
    )


@router.get("/refunds", dependencies=[Depends(RequirePermission("fees:view"))])
async def list_fee_refunds(
    student_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists student fee refunds."""
    stmt = (
        select(FeeRefund)
        .options(
            selectinload(FeeRefund.student),
            selectinload(FeeRefund.payment_mode),
            selectinload(FeeRefund.authorized_by),
        )
        .order_by(FeeRefund.refund_date.desc(), FeeRefund.created_at.desc())
    )
    if student_id:
        stmt = stmt.where(FeeRefund.student_id == student_id)

    res = await db.execute(stmt)
    refunds = res.scalars().all()
    return success_response(
        data=[
            {
                "id": r.id,
                "refund_no": r.refund_no,
                "student_id": r.student_id,
                "student_name": f"{r.student.first_name} {r.student.last_name or ''}".strip() if r.student else "-",
                "admission_no": r.student.admission_no if r.student else "-",
                "refund_amount": float(r.refund_amount),
                "refund_date": str(r.refund_date),
                "payment_mode_name": r.payment_mode.name if r.payment_mode else "Cash",
                "reason": r.reason,
                "authorized_by_name": r.authorized_by.username if r.authorized_by else "Admin",
            }
            for r in refunds
        ]
    )

