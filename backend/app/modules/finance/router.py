from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException, AppException
from app.shared.responses import success_response, paginated_response
from app.middlewares.auth_middleware import RequirePermission, CurrentTenantUser, get_current_user
from app.modules.fees.models import FeeCollection
from app.modules.finance.models import FinanceCategory, FinanceVoucher
from app.modules.finance.schemas import (
    FinanceCategoryCreate,
    FinanceVoucherCreate,
    CancelVoucherRequest,
)

router = APIRouter(prefix="/finance", tags=["Finance & Cashbook (Hisaab-Kitab)"])


@router.get("/categories", dependencies=[Depends(RequirePermission("finance:view"))])
async def list_finance_categories(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all income and expense categories."""
    stmt = select(FinanceCategory).order_by(FinanceCategory.name.asc())
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return success_response(
        data=[
            {"id": c.id, "name": c.name, "category_type": c.category_type, "code": c.code}
            for c in categories
        ]
    )


@router.post("/categories", dependencies=[Depends(RequirePermission("finance:view"))], status_code=status.HTTP_201_CREATED)
async def create_finance_category(req: FinanceCategoryCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new income or expense category."""
    cat = FinanceCategory(
        name=req.name,
        category_type=req.category_type,
        code=req.code.upper(),
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return success_response(data={"id": cat.id, "name": cat.name}, message="Category created")


@router.get("/vouchers", dependencies=[Depends(RequirePermission("finance:view"))])
async def list_vouchers(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    voucher_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Lists financial vouchers with date range and type filters."""
    stmt = (
        select(FinanceVoucher)
        .options(selectinload(FinanceVoucher.category), selectinload(FinanceVoucher.payment_mode))
        .order_by(FinanceVoucher.transaction_date.desc(), FinanceVoucher.created_at.desc())
    )
    if from_date:
        stmt = stmt.where(FinanceVoucher.transaction_date >= from_date)
    if to_date:
        stmt = stmt.where(FinanceVoucher.transaction_date <= to_date)
    if voucher_type:
        stmt = stmt.where(FinanceVoucher.voucher_type == voucher_type.upper())

    result = await db.execute(stmt)
    vouchers = result.scalars().all()

    return success_response(
        data=[
            {
                "id": v.id,
                "voucher_no": v.voucher_no,
                "voucher_type": v.voucher_type,
                "transaction_date": str(v.transaction_date),
                "amount": float(v.amount),
                "category_name": v.category.name if v.category else None,
                "payment_mode": v.payment_mode.name if v.payment_mode else None,
                "party_name": v.party_name,
                "reference_no": v.reference_no,
                "description": v.description,
                "status": v.status,
                "cancellation_reason": v.cancellation_reason,
            }
            for v in vouchers
        ]
    )


@router.post("/vouchers", dependencies=[Depends(RequirePermission("finance:voucher_create"))], status_code=status.HTTP_201_CREATED)
async def create_voucher(
    req: FinanceVoucherCreate,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Creates a new Income or Expense financial voucher."""
    count_stmt = select(func.count(FinanceVoucher.id))
    count_res = await db.execute(count_stmt)
    count = count_res.scalar() or 0
    year = date.today().year
    voucher_no = f"VCH-{year}-{(count + 1):04d}"

    voucher = FinanceVoucher(
        voucher_no=voucher_no,
        voucher_type=req.voucher_type,
        transaction_date=req.transaction_date or date.today(),
        amount=req.amount,
        category_id=req.category_id,
        payment_mode_id=req.payment_mode_id,
        party_name=req.party_name,
        reference_no=req.reference_no,
        description=req.description,
        created_by_user_id=current_user.id,
        status="POSTED",
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)

    return success_response(
        data={"voucher_no": voucher.voucher_no, "amount": float(voucher.amount), "status": voucher.status},
        message=f"Voucher '{voucher.voucher_no}' recorded successfully",
    )


@router.post("/vouchers/{voucher_no}/cancel", dependencies=[Depends(RequirePermission("finance:voucher_create"))])
async def cancel_voucher(
    voucher_no: str,
    req: CancelVoucherRequest,
    current_user: CurrentTenantUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Zero-Destructive Deletion: Cancels voucher and logs cancellation reason."""
    stmt = select(FinanceVoucher).where(FinanceVoucher.voucher_no == voucher_no)
    result = await db.execute(stmt)
    voucher = result.scalar_one_or_none()

    if not voucher:
        raise ResourceNotFoundException("FinanceVoucher", voucher_no)

    if voucher.status == "CANCELLED":
        raise AppException("Voucher is already cancelled")

    voucher.status = "CANCELLED"
    voucher.cancellation_reason = req.cancellation_reason
    voucher.cancelled_by_user_id = current_user.id
    voucher.cancelled_at = datetime.utcnow()

    await db.commit()
    await db.refresh(voucher)

    return success_response(
        data={"voucher_no": voucher.voucher_no, "status": voucher.status},
        message=f"Voucher '{voucher.voucher_no}' cancelled",
    )


@router.get("/day-book", dependencies=[Depends(RequirePermission("finance:view"))])
async def get_day_book(
    report_date: Optional[date] = Query(None),
    transaction_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Consolidated Day-Book: Combines student fee collections, fee refunds, and financial vouchers
    for the selected date to produce total cash inflow, outflow, and net daily balance.
    """
    target_date = report_date or transaction_date or date.today()

    from app.modules.fees.models import FeeRefund
    from app.modules.students.models import Student

    # 1. Active Fee Collections on this date
    fee_stmt = (
        select(FeeCollection)
        .options(selectinload(FeeCollection.student), selectinload(FeeCollection.payment_mode))
        .where(
            FeeCollection.collection_date == target_date,
            FeeCollection.status == "CONFIRMED",
        )
        .order_by(FeeCollection.created_at.asc())
    )
    fee_res = await db.execute(fee_stmt)
    fee_collections = fee_res.scalars().all()
    total_fee = sum((c.total_amount_paid for c in fee_collections), Decimal("0.00"))

    # 2. Fee Refunds disbursed on this date
    refund_stmt = (
        select(FeeRefund)
        .options(selectinload(FeeRefund.student), selectinload(FeeRefund.payment_mode))
        .where(FeeRefund.refund_date == target_date)
        .order_by(FeeRefund.created_at.asc())
    )
    refund_res = await db.execute(refund_stmt)
    fee_refunds = refund_res.scalars().all()
    total_refunds = sum((r.refund_amount for r in fee_refunds), Decimal("0.00"))

    # 3. Financial Vouchers on this date
    vch_stmt = (
        select(FinanceVoucher)
        .options(selectinload(FinanceVoucher.category), selectinload(FinanceVoucher.payment_mode))
        .where(
            FinanceVoucher.transaction_date == target_date,
            FinanceVoucher.status == "POSTED",
        )
        .order_by(FinanceVoucher.created_at.asc())
    )
    vch_res = await db.execute(vch_stmt)
    vouchers = vch_res.scalars().all()

    other_income = sum((v.amount for v in vouchers if v.voucher_type == "INCOME"), Decimal("0.00"))
    total_voucher_expenses = sum((v.amount for v in vouchers if v.voucher_type == "EXPENSE"), Decimal("0.00"))

    total_gross_income = Decimal(str(total_fee)) + Decimal(str(other_income))
    total_expenses = Decimal(str(total_voucher_expenses)) + Decimal(str(total_refunds))
    net_cashflow = total_gross_income - total_expenses

    # Combine all items into transaction list for Day-Book table
    daily_items = []
    for c in fee_collections:
        st_name = f"{c.student.first_name} {c.student.last_name or ''}".strip() if c.student else "Student"
        mode_name = c.payment_mode.name if c.payment_mode else "Cash"
        daily_items.append({
            "id": c.id,
            "voucher_no": c.receipt_no,
            "voucher_type": "INCOME",
            "party_name": f"{st_name} (Adm: {c.student.admission_no if c.student else '-'})",
            "description": f"Fee Collection via {mode_name}",
            "amount": float(c.total_amount_paid),
        })

    for r in fee_refunds:
        st_name = f"{r.student.first_name} {r.student.last_name or ''}".strip() if r.student else "Student"
        mode_name = r.payment_mode.name if r.payment_mode else "Cash"
        daily_items.append({
            "id": r.id,
            "voucher_no": r.refund_no,
            "voucher_type": "EXPENSE",
            "party_name": f"{st_name} (Adm: {r.student.admission_no if r.student else '-'})",
            "description": f"Fee Refund ({mode_name}): {r.reason}",
            "amount": float(r.refund_amount),
        })

    for v in vouchers:
        daily_items.append({
            "id": v.id,
            "voucher_no": v.voucher_no,
            "voucher_type": v.voucher_type,
            "party_name": v.party_name or (v.category.name if v.category else "Voucher"),
            "description": v.description or (f"{v.category.name} expense" if v.category else "Voucher"),
            "amount": float(v.amount),
        })

    return success_response(
        data={
            "report_date": str(target_date),
            "total_fee_collections": float(total_fee),
            "total_fee_refunds": float(total_refunds),
            "total_other_income": float(other_income),
            "total_other_incomes": float(other_income),
            "total_gross_income": float(total_gross_income),
            "total_expenses": float(total_expenses),
            "net_daily_cashflow": float(net_cashflow),
            "vouchers": daily_items,
        }
    )
