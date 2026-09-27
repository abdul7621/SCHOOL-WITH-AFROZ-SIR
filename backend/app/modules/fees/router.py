from typing import List, Optional
from datetime import datetime, date
import uuid
import urllib.parse
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException, AppException
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
    TenantPaymentGatewayConfig,
    OnlinePaymentOrder,
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
    WaiveFeeDemandsRequest,
    PaymentGatewayConfigSave,
    CreateOnlinePaymentOrderRequest,
    SubmitDirectUpiUtrRequest,
    CashierVerifyOrderRequest,
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
        .options(selectinload(FeeStructure.class_level), selectinload(FeeStructure.items).joinedload(FeeStructureItem.fee_head))
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


@router.post("/demands/waive", dependencies=[Depends(RequirePermission("fees:waive"))])
async def waive_fee_demands(
    req: WaiveFeeDemandsRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Principal Fee Waiver Authorization (FIX-08):
    Authorizes zeroing of outstanding fee demands (e.g., EWS hardship or Transfer Certificate clearance).
    Restricted to School Principal, SuperAdmin, and Management.
    """
    result = await FeeService.waive_fee_demands(
        req=req,
        principal_user_id=current_user.id,
        db=db,
    )
    return success_response(
        data=result,
        message=f"Successfully waived {result['waived_count']} demand(s) totaling ₹{result['total_waived_amount']:.2f}",
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
    academic_year_id: Optional[str] = Query(None, description="Academic Session ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves full student statement of account / fee ledger with all demands and payments."""
    ledger = await FeeService.get_student_ledger(
        student_id=student_id,
        academic_year_id=academic_year_id,
        db=db,
    )
    return success_response(data=ledger)


@router.get("/wallet/{student_id}", dependencies=[Depends(RequirePermission("fees:view"))])
async def get_student_fee_wallet(
    student_id: str,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Retrieves student's advance fee wallet balance and transaction ledger."""
    wallet_data = await FeeService.get_student_wallet(student_id=student_id, db=db)
    return success_response(data=wallet_data)


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


# ==========================================
# 9. Multi-Tenant Payment Gateways & Direct UPI (Phase 4)
# ==========================================
@router.get("/gateways/configs", dependencies=[Depends(RequirePermission("settings:manage"))])
async def list_gateway_configs(db: AsyncSession = Depends(get_tenant_db)):
    """Principal/Admin Action: Lists all payment gateway configurations with masked secrets."""
    stmt = select(TenantPaymentGatewayConfig).order_by(TenantPaymentGatewayConfig.provider.asc())
    res = await db.execute(stmt)
    configs = res.scalars().all()
    data = []
    for c in configs:
        masked_sec = ("*" * 8 + c.key_secret[-4:]) if c.key_secret and len(c.key_secret) > 4 else ("******" if c.key_secret else None)
        data.append({
            "id": c.id,
            "provider": c.provider,
            "is_active": c.is_active,
            "merchant_name": c.merchant_name,
            "upi_vpa": c.upi_vpa,
            "upi_payee_name": c.upi_payee_name,
            "key_id": c.key_id,
            "key_secret_masked": masked_sec,
            "has_webhook_secret": bool(c.webhook_secret),
        })
    return success_response(data=data)


@router.post("/gateways/configs", dependencies=[Depends(RequirePermission("settings:manage"))])
async def save_gateway_config(req: PaymentGatewayConfigSave, db: AsyncSession = Depends(get_tenant_db)):
    """Principal/Admin Action: Configures or toggles Direct UPI VPA or merchant gateway credentials."""
    stmt = select(TenantPaymentGatewayConfig).where(TenantPaymentGatewayConfig.provider == req.provider.upper())
    res = await db.execute(stmt)
    config = res.scalar_one_or_none()

    if config:
        config.is_active = req.is_active
        if req.merchant_name is not None:
            config.merchant_name = req.merchant_name.strip()
        if req.upi_vpa is not None:
            config.upi_vpa = req.upi_vpa.strip()
        if req.upi_payee_name is not None:
            config.upi_payee_name = req.upi_payee_name.strip()
        if req.key_id is not None:
            config.key_id = req.key_id.strip()
        if req.key_secret is not None and not req.key_secret.startswith("******"):
            config.key_secret = req.key_secret.strip()
        if req.webhook_secret is not None:
            config.webhook_secret = req.webhook_secret.strip()
    else:
        config = TenantPaymentGatewayConfig(
            provider=req.provider.upper(),
            is_active=req.is_active,
            merchant_name=req.merchant_name.strip() if req.merchant_name else None,
            upi_vpa=req.upi_vpa.strip() if req.upi_vpa else None,
            upi_payee_name=req.upi_payee_name.strip() if req.upi_payee_name else None,
            key_id=req.key_id.strip() if req.key_id else None,
            key_secret=req.key_secret.strip() if req.key_secret else None,
            webhook_secret=req.webhook_secret.strip() if req.webhook_secret else None,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return success_response(
        data={"id": config.id, "provider": config.provider, "is_active": config.is_active},
        message=f"Gateway configuration for '{config.provider}' saved successfully."
    )


@router.get("/gateways/active")
async def get_active_payment_gateways(db: AsyncSession = Depends(get_tenant_db)):
    """Public / Parent Action: Retrieves active payment methods available for the school."""
    stmt = select(TenantPaymentGatewayConfig).where(TenantPaymentGatewayConfig.is_active == True)
    res = await db.execute(stmt)
    configs = res.scalars().all()
    active_options = []
    for c in configs:
        active_options.append({
            "provider": c.provider,
            "merchant_name": c.merchant_name,
            "upi_vpa": c.upi_vpa,
            "upi_payee_name": c.upi_payee_name,
            "key_id": c.key_id,
        })
    return success_response(data=active_options)


@router.post("/online/create-order")
async def create_online_payment_order(
    req: CreateOnlinePaymentOrderRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent/Student Action: Initiates an online fee payment and returns UPI deep-link / Gateway order."""
    from app.modules.students.models import Student, StudentEnrollment
    from app.modules.academics.models import AcademicYear

    student = (await db.execute(select(Student).where(Student.id == req.student_id))).scalar_one_or_none()
    if not student:
        raise ResourceNotFoundException("Student", req.student_id)

    # Find active academic year
    enr = (
        await db.execute(
            select(StudentEnrollment)
            .where(StudentEnrollment.student_id == req.student_id, StudentEnrollment.is_active == True)
        )
    ).scalar_one_or_none()
    ay_id = enr.academic_year_id if enr else None
    if not ay_id:
        curr_ay = (await db.execute(select(AcademicYear.id).where(AcademicYear.is_current == True))).scalar_one_or_none()
        ay_id = curr_ay or "current"

    # Verify provider is configured and active
    provider_clean = req.gateway_provider.upper()
    cfg_stmt = select(TenantPaymentGatewayConfig).where(
        TenantPaymentGatewayConfig.provider == provider_clean,
        TenantPaymentGatewayConfig.is_active == True,
    )
    cfg = (await db.execute(cfg_stmt)).scalar_one_or_none()
    if not cfg:
        # Fallback to any active provider if requested not found
        cfg_stmt2 = select(TenantPaymentGatewayConfig).where(TenantPaymentGatewayConfig.is_active == True)
        cfg = (await db.execute(cfg_stmt2)).scalar_one_or_none()
        if not cfg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Online payment is currently not enabled by the school administration."
            )
        provider_clean = cfg.provider

    order_num = f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    order = OnlinePaymentOrder(
        order_number=order_num,
        student_id=req.student_id,
        academic_year_id=ay_id,
        amount=req.amount,
        gateway_provider=provider_clean,
        status="PENDING",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # If Direct UPI, format standard NPCI UPI URI string
    upi_intent_url = None
    if provider_clean == "DIRECT_UPI_QR" and cfg.upi_vpa:
        payee_encoded = urllib.parse.quote(cfg.upi_payee_name or "School Fees")
        note_encoded = urllib.parse.quote(f"Fee {student.first_name} {order_num}")
        upi_intent_url = (
            f"upi://pay?pa={cfg.upi_vpa}&pn={payee_encoded}&am={req.amount:.2f}&cu=INR&tn={note_encoded}"
        )

    return success_response(
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "amount": float(order.amount),
            "gateway_provider": order.gateway_provider,
            "upi_vpa": cfg.upi_vpa,
            "upi_payee_name": cfg.upi_payee_name,
            "upi_intent_url": upi_intent_url,
            "upi_payment_link": upi_intent_url,
            "status": order.status,
        },
        message="Payment order initialized."
    )


@router.post("/online/submit-utr")
async def submit_direct_upi_utr(
    req: SubmitDirectUpiUtrRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Parent Action: Submits 12-digit UPI UTR number after transferring fees for cashier verification."""
    order = (await db.execute(select(OnlinePaymentOrder).where(OnlinePaymentOrder.id == req.order_id))).scalar_one_or_none()
    if not order:
        raise ResourceNotFoundException("OnlinePaymentOrder", req.order_id)

    order.utr_number = req.utr_number.strip()
    order.status = "VERIFICATION_PENDING"
    await db.commit()
    await db.refresh(order)

    return success_response(
        data={"order_id": order.id, "status": order.status, "utr_number": order.utr_number},
        message="UTR number submitted successfully. The school cashier will verify against the bank statement and issue your official receipt."
    )


@router.get("/online/pending-approvals", dependencies=[Depends(RequirePermission("fees:collect"))])
async def list_pending_online_approvals(db: AsyncSession = Depends(get_tenant_db)):
    """Cashier Action: Lists all Direct UPI payments submitted by parents awaiting bank verification."""
    from app.modules.students.models import Student, StudentEnrollment, Parent
    from app.modules.academics.models import ClassLevel, Section

    stmt = (
        select(OnlinePaymentOrder, Student, Parent, ClassLevel, Section)
        .join(Student, OnlinePaymentOrder.student_id == Student.id)
        .outerjoin(Parent, Student.parent_id == Parent.id)
        .outerjoin(StudentEnrollment, (Student.id == StudentEnrollment.student_id) & (StudentEnrollment.is_active == True))
        .outerjoin(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
        .outerjoin(Section, StudentEnrollment.section_id == Section.id)
        .where(OnlinePaymentOrder.status == "VERIFICATION_PENDING")
        .order_by(OnlinePaymentOrder.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    orders = []
    for order, st, pr, cls, sec in rows:
        orders.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "amount": float(order.amount),
            "gateway_provider": order.gateway_provider,
            "utr_number": order.utr_number,
            "status": order.status,
            "created_at": str(order.created_at),
            "student_id": st.id,
            "student_name": f"{st.first_name} {st.last_name or ''}".strip(),
            "admission_no": st.admission_no,
            "class_name": cls.name if cls else "N/A",
            "section_name": sec.name if sec else "N/A",
            "parent_phone": pr.primary_phone if pr else "N/A",
        })

    return success_response(data=orders)


@router.post("/online/orders/{order_id}/verify", dependencies=[Depends(RequirePermission("fees:collect"))])
async def cashier_verify_online_order(
    order_id: str,
    req: CashierVerifyOrderRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Cashier 1-Click Action: Approves or rejects a Direct UPI UTR submission.
    When APPROVED:
    Executes Penny-Perfect FIFO collection via FeeService.collect_fee_payment,
    clearing demands sequentially, depositing any advance wallet credit,
    and generating the official sequential RCP-... receipt.
    """
    from app.modules.lookups.models import PaymentMode

    order = (await db.execute(select(OnlinePaymentOrder).where(OnlinePaymentOrder.id == order_id))).scalar_one_or_none()
    if not order:
        raise ResourceNotFoundException("OnlinePaymentOrder", order_id)

    if order.status == "SUCCESS":
        return success_response(
            data={"order_id": order.id, "receipt_no": order.receipt_no, "status": order.status},
            message=f"Order has already been verified and paid under receipt '{order.receipt_no}'."
        )

    if req.action == "REJECT":
        order.status = "FAILED"
        order.payment_response_payload = req.rejection_reason or "Rejected by cashier (UTR invalid / unverified)"
        order.verified_by_user_id = current_user.id
        order.verified_at = datetime.utcnow()
        await db.commit()
        return success_response(data={"order_id": order.id, "status": "FAILED"}, message="Payment order rejected.")

    # APPROVAL FLOW: Penny-perfect fee collection
    pm_res = await db.execute(select(PaymentMode).where(PaymentMode.code.in_(["UPI_QR", "ONLINE", "BANK_TRANSFER"])))
    pm = pm_res.scalar_one_or_none()
    if not pm:
        pm_res2 = await db.execute(select(PaymentMode).limit(1))
        pm = pm_res2.scalar_one_or_none()
    pm_id = pm.id if pm else None

    collect_req = CollectFeePaymentRequest(
        student_id=order.student_id,
        academic_year_id=order.academic_year_id,
        total_amount_paid=order.amount,
        payment_mode_id=pm_id,
        transaction_reference_no=f"UPI-{order.utr_number or order.order_number}",
        remarks=f"Online UPI payment verified by cashier (Order #{order.order_number}, UTR #{order.utr_number})",
    )

    fee_collection = await FeeService.collect_fee_payment(
        req=collect_req,
        cashier_user_id=current_user.id,
        db=db,
    )

    order.status = "SUCCESS"
    order.fee_collection_id = fee_collection.id
    order.receipt_no = fee_collection.receipt_no
    order.verified_by_user_id = current_user.id
    order.verified_at = datetime.utcnow()

    await db.commit()
    await db.refresh(order)

    return success_response(
        data={
            "order_id": order.id,
            "order_number": order.order_number,
            "receipt_no": order.receipt_no,
            "status": order.status,
            "fee_collection_id": fee_collection.id,
            "amount_paid": float(fee_collection.total_amount_paid),
        },
        message=f"UPI payment verified! Official Receipt '{order.receipt_no}' generated successfully."
    )


