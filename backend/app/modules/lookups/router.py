from typing import List, Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_tenant_db
from app.core.exceptions import ResourceNotFoundException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.lookups.models import LookupCategory, LookupValue, StudentStatus, PaymentMode

router = APIRouter(prefix="/lookups", tags=["Dynamic Lookups & Taxonomies"])


class LookupValueCreate(BaseModel):
    code: str
    label: str
    numeric_value: int = 0


@router.get("/categories")
async def list_lookup_categories(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all available lookup taxonomy categories in the tenant."""
    stmt = select(LookupCategory).order_by(LookupCategory.name.asc())
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return success_response(
        data=[{"id": c.id, "code": c.code, "name": c.name, "is_system": c.is_system} for c in categories]
    )


@router.get("/categories/{category_code}/values")
async def get_category_values(category_code: str, db: AsyncSession = Depends(get_tenant_db)):
    """Retrieves all active values under a taxonomy category (e.g. GENDER, BLOOD_GROUP, RELIGION)."""
    stmt = (
        select(LookupCategory)
        .options(selectinload(LookupCategory.values))
        .where(LookupCategory.code == category_code.upper())
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise ResourceNotFoundException("LookupCategory", category_code)

    values = [
        {"id": v.id, "code": v.code, "label": v.label, "numeric_value": v.numeric_value}
        for v in category.values
        if v.is_active
    ]
    return success_response(data=values, message=f"Values for '{category.name}' retrieved")


@router.post("/categories/{category_code}/values", dependencies=[Depends(RequirePermission("settings:manage"))])
async def add_category_value(
    category_code: str,
    req: LookupValueCreate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Admin Action: Adds a new custom lookup option to a category."""
    stmt = select(LookupCategory).where(LookupCategory.code == category_code.upper())
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise ResourceNotFoundException("LookupCategory", category_code)

    new_val = LookupValue(
        category_id=category.id,
        code=req.code.upper(),
        label=req.label,
        numeric_value=req.numeric_value,
        is_active=True,
    )
    db.add(new_val)
    await db.commit()
    await db.refresh(new_val)

    return success_response(
        data={"id": new_val.id, "code": new_val.code, "label": new_val.label},
        message=f"Lookup value '{new_val.label}' added to '{category.name}'",
    )


@router.get("/student-statuses")
async def list_student_statuses(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all active student statuses."""
    stmt = select(StudentStatus).order_by(StudentStatus.name.asc())
    result = await db.execute(stmt)
    statuses = result.scalars().all()
    return success_response(
        data=[
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "allow_attendance": s.allow_attendance,
                "allow_fee_demand": s.allow_fee_demand,
            }
            for s in statuses
        ]
    )


@router.get("/payment-modes")
async def list_payment_modes(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all active fee collection and expense payment modes."""
    stmt = select(PaymentMode).where(PaymentMode.is_active == True).order_by(PaymentMode.name.asc())
    result = await db.execute(stmt)
    modes = result.scalars().all()
    return success_response(
        data=[
            {
                "id": m.id,
                "code": m.code,
                "name": m.name,
                "requires_reference_no": m.requires_reference_no,
            }
            for m in modes
        ]
    )
