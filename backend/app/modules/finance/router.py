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
    report_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Consolidated Day-Book: Combines student fee collections and financial vouchers
    for the selected date to produce total cash inflow, outflow, and net daily balance.
    """
    # 1. Active Fee Collections on this date
    fee_stmt = (
        select(func.sum(FeeCollection.total_amount_paid))
        .where(
            FeeCollection.collection_date == report_date,
            FeeCollection.status == "CONFIRMED",
        )
    )
    fee_res = await db.execute(fee_stmt)
    total_fee = fee_res.scalar() or Decimal("0.00")

    # 2. Other Incomes on this date
    inc_stmt = (
        select(func.sum(FinanceVoucher.amount))
        .where(
            FinanceVoucher.transaction_date == report_date,
            FinanceVoucher.voucher_type == "INCOME",
            FinanceVoucher.status == "POSTED",
        )
    )
    inc_res = await db.execute(inc_stmt)
    other_income = inc_res.scalar() or Decimal("0.00")

    # 3. Expenses on this date
    exp_stmt = (
        select(func.sum(FinanceVoucher.amount))
        .where(
            FinanceVoucher.transaction_date == report_date,
            FinanceVoucher.voucher_type == "EXPENSE",
            FinanceVoucher.status == "POSTED",
        )
    )
    exp_res = await db.execute(exp_stmt)
    total_expenses = exp_res.scalar() or Decimal("0.00")

    net_cashflow = (Decimal(str(total_fee)) + Decimal(str(other_income))) - Decimal(str(total_expenses))

    return success_response(
        data={
            "report_date": str(report_date),
            "total_fee_collections": float(total_fee),
            "total_other_income": float(other_income),
            "total_gross_income": float(total_fee + other_income),
            "total_expenses": float(total_expenses),
            "net_daily_cashflow": float(net_cashflow),
        }
    )
