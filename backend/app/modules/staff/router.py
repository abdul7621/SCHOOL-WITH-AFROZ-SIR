from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_tenant_db
from app.core.security import get_password_hash
from app.core.exceptions import AppException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.users_rbac.models import User, UserRole
from app.modules.staff.models import Department, Designation, StaffProfile
from app.modules.staff.schemas import (
    DepartmentCreate,
    DesignationCreate,
    StaffCreateRequest,
)

router = APIRouter(prefix="/staff", tags=["Staff & Teacher Directory"])


@router.get("", dependencies=[Depends(RequirePermission("users:manage"))])
async def list_staff(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all staff members with designation and department."""
    stmt = (
        select(StaffProfile)
        .options(
            selectinload(StaffProfile.user),
            selectinload(StaffProfile.designation),
            selectinload(StaffProfile.department),
        )
        .order_by(StaffProfile.first_name.asc())
    )
    result = await db.execute(stmt)
    staff_list = result.scalars().all()

    return success_response(
        data=[
            {
                "id": s.id,
                "user_id": s.user_id,
                "employee_id": s.employee_id,
                "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
                "email": s.user.email if s.user else None,
                "phone": s.user.phone if s.user else None,
                "designation": s.designation.title if s.designation else None,
                "department": s.department.name if s.department else None,
                "qualification": s.qualification,
                "joining_date": str(s.joining_date),
                "is_active": s.is_active,
            }
            for s in staff_list
        ]
    )


@router.post("", dependencies=[Depends(RequirePermission("users:manage"))], status_code=status.HTTP_201_CREATED)
async def create_staff(req: StaffCreateRequest, db: AsyncSession = Depends(get_tenant_db)):
    """
    Creates a new staff login user account, links to specified role,
    and initializes their StaffProfile record.
    """
    # 1. Check duplicate username/email/phone
    existing_user = await db.execute(
        select(User).where((User.email == req.email) | (User.phone == req.phone))
    )
    if existing_user.scalar_one_or_none():
        raise AppException("User with this email or phone number already exists", "USER_ALREADY_EXISTS")

    # 2. Create User Login
    user = User(
        username=req.email,
        email=req.email,
        phone=req.phone,
        password_hash=get_password_hash(req.password),
        user_type="STAFF",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # 3. Assign Role
    user_role = UserRole(user_id=user.id, role_id=req.role_id)
    db.add(user_role)

    # 4. Create StaffProfile
    profile = StaffProfile(
        user_id=user.id,
        employee_id=req.employee_id,
        first_name=req.first_name,
        last_name=req.last_name,
        designation_id=req.designation_id,
        department_id=req.department_id,
        qualification=req.qualification,
        joining_date=req.joining_date,
        emergency_contact=req.emergency_contact,
        is_active=True,
    )
    db.add(profile)

    await db.commit()
    await db.refresh(profile)

    return success_response(
        data={"id": profile.id, "employee_id": profile.employee_id, "user_id": user.id},
        message=f"Staff member '{profile.first_name}' created successfully",
    )


@router.get("/departments")
async def list_departments(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all school departments."""
    stmt = select(Department).order_by(Department.name.asc())
    result = await db.execute(stmt)
    deps = result.scalars().all()
    return success_response(data=[{"id": d.id, "name": d.name, "code": d.code} for d in deps])


@router.post("/departments", dependencies=[Depends(RequirePermission("users:manage"))])
async def create_department(req: DepartmentCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new department."""
    dep = Department(name=req.name, code=req.code.upper())
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return success_response(data={"id": dep.id, "name": dep.name}, message="Department created")


@router.get("/designations")
async def list_designations(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all school job designations."""
    stmt = select(Designation).order_by(Designation.title.asc())
    result = await db.execute(stmt)
    desigs = result.scalars().all()
    return success_response(data=[{"id": d.id, "title": d.title, "code": d.code} for d in desigs])


@router.post("/designations", dependencies=[Depends(RequirePermission("users:manage"))])
async def create_designation(req: DesignationCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Creates a new designation."""
    desig = Designation(title=req.title, code=req.code.upper())
    db.add(desig)
    await db.commit()
    await db.refresh(desig)
    return success_response(data={"id": desig.id, "title": desig.title}, message="Designation created")
