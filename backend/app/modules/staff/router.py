from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_db
from app.core.security import get_password_hash
from app.core.exceptions import AppException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import RequirePermission
from app.modules.users_rbac.models import User, UserRole, Role
from app.modules.staff.models import Department, Designation, StaffProfile
from app.modules.staff.schemas import (
    DepartmentCreate,
    DesignationCreate,
    StaffCreateRequest,
    StaffUpdateRequest,
    StaffResetPasswordRequest,
)

router = APIRouter(prefix="/staff", tags=["Staff & Teacher Directory"])


@router.get("", dependencies=[Depends(RequirePermission("users:manage"))])
async def list_staff(db: AsyncSession = Depends(get_tenant_db)):
    """Lists all staff members with designation, department, and assigned login role."""
    stmt = (
        select(StaffProfile, User, Designation, Department)
        .outerjoin(User, StaffProfile.user_id == User.id)
        .outerjoin(Designation, StaffProfile.designation_id == Designation.id)
        .outerjoin(Department, StaffProfile.department_id == Department.id)
        .order_by(StaffProfile.first_name.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Preload user roles in bulk to avoid async lazy loading
    user_ids = [u.id for _, u, _, _ in rows if u]
    user_roles_map = {}
    if user_ids:
        role_stmt = (
            select(UserRole.user_id, Role.id, Role.name, Role.code)
            .join(Role, UserRole.role_id == Role.id)
            .where(UserRole.user_id.in_(user_ids))
        )
        role_res = await db.execute(role_stmt)
        for uid, rid, rname, rcode in role_res.all():
            user_roles_map[uid] = {"id": rid, "name": rname, "code": rcode}

    staff_data = []
    for s, u, desig, dept in rows:
        role_info = user_roles_map.get(u.id) if u else None
        staff_data.append({
            "id": s.id,
            "user_id": s.user_id,
            "employee_id": s.employee_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
            "email": u.email if u else None,
            "phone": u.phone if u else None,
            "designation_id": s.designation_id,
            "designation": desig.title if desig else None,
            "department_id": s.department_id,
            "department": dept.name if dept else None,
            "role_id": role_info["id"] if role_info else None,
            "role_name": role_info["name"] if role_info else None,
            "role_code": role_info["code"] if role_info else None,
            "qualification": s.qualification,
            "joining_date": str(s.joining_date),
            "emergency_contact": s.emergency_contact,
            "is_active": s.is_active,
        })

    return success_response(data=staff_data)


@router.get("/{staff_id}", dependencies=[Depends(RequirePermission("users:manage"))])
async def get_staff(staff_id: str, db: AsyncSession = Depends(get_tenant_db)):
    """Retrieves full details for a single staff member."""
    stmt = (
        select(StaffProfile, User, Designation, Department)
        .outerjoin(User, StaffProfile.user_id == User.id)
        .outerjoin(Designation, StaffProfile.designation_id == Designation.id)
        .outerjoin(Department, StaffProfile.department_id == Department.id)
        .where(StaffProfile.id == staff_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise AppException("Staff member not found", "STAFF_NOT_FOUND", status.HTTP_404_NOT_FOUND)

    s, u, desig, dept = row
    role_info = None
    if u:
        role_stmt = (
            select(Role.id, Role.name, Role.code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == u.id)
        )
        role_res = await db.execute(role_stmt)
        r = role_res.first()
        if r:
            role_info = {"id": r[0], "name": r[1], "code": r[2]}

    return success_response(
        data={
            "id": s.id,
            "user_id": s.user_id,
            "employee_id": s.employee_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "full_name": f"{s.first_name} {s.last_name or ''}".strip(),
            "email": u.email if u else None,
            "phone": u.phone if u else None,
            "designation_id": s.designation_id,
            "designation": desig.title if desig else None,
            "department_id": s.department_id,
            "department": dept.name if dept else None,
            "role_id": role_info["id"] if role_info else None,
            "role_name": role_info["name"] if role_info else None,
            "role_code": role_info["code"] if role_info else None,
            "qualification": s.qualification,
            "joining_date": str(s.joining_date),
            "emergency_contact": s.emergency_contact,
            "is_active": s.is_active,
        }
    )


@router.post("", dependencies=[Depends(RequirePermission("users:manage"))], status_code=status.HTTP_201_CREATED)
async def create_staff(req: StaffCreateRequest, db: AsyncSession = Depends(get_tenant_db)):
    """
    Creates a new staff login user account, links to specified role,
    and initializes their StaffProfile record.
    """
    clean_email = req.email.strip().lower()
    clean_phone = req.phone.strip()

    # 1. Check duplicate username/email/phone
    existing_user = await db.execute(
        select(User).where((func.lower(User.email) == clean_email) | (User.phone == clean_phone))
    )
    if existing_user.scalar_one_or_none():
        raise AppException("User with this email or phone number already exists", "USER_ALREADY_EXISTS")

    # Check duplicate employee_id
    existing_emp = await db.execute(
        select(StaffProfile).where(StaffProfile.employee_id == req.employee_id.strip())
    )
    if existing_emp.scalar_one_or_none():
        raise AppException("Staff member with this Employee ID already exists", "EMPLOYEE_ID_ALREADY_EXISTS")

    # 2. Create User Login
    user = User(
        username=clean_email,
        email=clean_email,
        phone=clean_phone,
        password_hash=get_password_hash(req.password.strip()),
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
        employee_id=req.employee_id.strip(),
        first_name=req.first_name.strip(),
        last_name=req.last_name.strip() if req.last_name else None,
        designation_id=req.designation_id,
        department_id=req.department_id,
        qualification=req.qualification.strip() if req.qualification else None,
        joining_date=req.joining_date,
        emergency_contact=req.emergency_contact.strip() if req.emergency_contact else None,
        is_active=True,
    )
    db.add(profile)

    await db.commit()
    await db.refresh(profile)

    return success_response(
        data={"id": profile.id, "employee_id": profile.employee_id, "user_id": user.id},
        message=f"Staff member '{profile.first_name}' created successfully",
    )


@router.put("/{staff_id}", dependencies=[Depends(RequirePermission("users:manage"))])
async def update_staff(
    staff_id: str,
    req: StaffUpdateRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Updates staff member details, user account login information, role, and active status."""
    stmt = select(StaffProfile).where(StaffProfile.id == staff_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise AppException("Staff member not found", "STAFF_NOT_FOUND", status.HTTP_404_NOT_FOUND)

    # Fetch linked user
    user = None
    if profile.user_id:
        u_res = await db.execute(select(User).where(User.id == profile.user_id))
        user = u_res.scalar_one_or_none()

    if user:
        if req.email:
            clean_email = req.email.strip().lower()
            if clean_email != (user.email or "").lower():
                dup = await db.execute(
                    select(User).where(func.lower(User.email) == clean_email, User.id != user.id)
                )
                if dup.scalar_one_or_none():
                    raise AppException("User with this email already exists", "EMAIL_EXISTS")
                user.email = clean_email
                user.username = clean_email

        if req.phone:
            clean_phone = req.phone.strip()
            if clean_phone != user.phone:
                dup = await db.execute(
                    select(User).where(User.phone == clean_phone, User.id != user.id)
                )
                if dup.scalar_one_or_none():
                    raise AppException("User with this phone number already exists", "PHONE_EXISTS")
                user.phone = clean_phone

        if req.password:
            user.password_hash = get_password_hash(req.password.strip())

        if req.is_active is not None:
            user.is_active = req.is_active

        if req.role_id:
            await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
            db.add(UserRole(user_id=user.id, role_id=req.role_id))

    if req.employee_id:
        clean_emp = req.employee_id.strip()
        if clean_emp != profile.employee_id:
            dup = await db.execute(
                select(StaffProfile).where(StaffProfile.employee_id == clean_emp, StaffProfile.id != profile.id)
            )
            if dup.scalar_one_or_none():
                raise AppException("Employee ID already exists", "EMPLOYEE_ID_EXISTS")
            profile.employee_id = clean_emp

    if req.first_name is not None:
        profile.first_name = req.first_name.strip()
    if req.last_name is not None:
        profile.last_name = req.last_name.strip() if req.last_name else None
    if req.designation_id is not None:
        profile.designation_id = req.designation_id
    if req.department_id is not None:
        profile.department_id = req.department_id
    if req.qualification is not None:
        profile.qualification = req.qualification.strip() if req.qualification else None
    if req.joining_date is not None:
        profile.joining_date = req.joining_date
    if req.emergency_contact is not None:
        profile.emergency_contact = req.emergency_contact.strip() if req.emergency_contact else None
    if req.is_active is not None:
        profile.is_active = req.is_active

    await db.commit()
    await db.refresh(profile)

    return success_response(
        data={"id": profile.id, "employee_id": profile.employee_id},
        message=f"Staff member '{profile.first_name}' updated successfully",
    )


@router.put("/{staff_id}/reset-password", dependencies=[Depends(RequirePermission("users:manage"))])
async def reset_staff_password(
    staff_id: str,
    req: StaffResetPasswordRequest,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Directly sets a new password for staff login account."""
    stmt = select(StaffProfile).where(StaffProfile.id == staff_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile or not profile.user_id:
        raise AppException("Staff record not found", "STAFF_NOT_FOUND", status.HTTP_404_NOT_FOUND)

    u_res = await db.execute(select(User).where(User.id == profile.user_id))
    user = u_res.scalar_one_or_none()
    if not user:
        raise AppException("User login record not found", "USER_NOT_FOUND", status.HTTP_404_NOT_FOUND)

    user.password_hash = get_password_hash(req.password.strip())
    await db.commit()

    return success_response(
        message=f"Password for {profile.first_name} has been reset successfully",
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
    dep = Department(name=req.name.strip(), code=req.code.strip().upper())
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
    desig = Designation(title=req.title.strip(), code=req.code.strip().upper())
    db.add(desig)
    await db.commit()
    await db.refresh(desig)
    return success_response(data={"id": desig.id, "title": desig.title}, message="Designation created")


@router.get("/roles", dependencies=[Depends(RequirePermission("users:manage"))])
async def list_roles(db: AsyncSession = Depends(get_tenant_db)):
    """Lists available system roles for staff assignment."""
    stmt = select(Role).where(Role.code != "PARENT").order_by(Role.name.asc())
    result = await db.execute(stmt)
    roles = result.scalars().all()
    return success_response(data=[{"id": r.id, "name": r.name, "code": r.code} for r in roles])
