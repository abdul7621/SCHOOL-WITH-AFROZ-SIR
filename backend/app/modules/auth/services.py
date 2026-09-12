from typing import List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.exceptions import InvalidCredentialsException
from app.modules.users_rbac.models import User, Role, UserRole, Permission, RolePermission
from app.modules.staff.models import StaffProfile


class AuthService:
    @staticmethod
    async def authenticate_tenant_user(
        db: AsyncSession,
        username_or_phone: str,
        password: str,
        tenant_slug: str,
    ) -> Tuple[User, List[str], List[str], str, str]:
        """
        Authenticates a tenant user against the resolved tenant database,
        gathers their assigned roles and permissions, and issues JWT tokens.
        Supports login via Email, Phone Number, Username, or Staff Employee ID.
        """
        clean_input = (username_or_phone or "").strip()
        clean_password = (password or "").strip()

        # Check if the input is an Employee ID
        matched_user_id = None
        staff_stmt = select(StaffProfile.user_id).where(
            func.lower(StaffProfile.employee_id) == clean_input.lower(),
            StaffProfile.is_active == True,
        )
        staff_res = await db.execute(staff_stmt)
        matched_user_id = staff_res.scalar_one_or_none()

        conditions = [
            func.lower(User.username) == clean_input.lower(),
            User.phone == clean_input,
            func.lower(User.email) == clean_input.lower(),
        ]
        if matched_user_id:
            conditions.append(User.id == matched_user_id)

        stmt = select(User).where(or_(*conditions), User.is_active == True)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(clean_password, user.password_hash):
            raise InvalidCredentialsException("Invalid username/phone or password")

        from app.modules.lookups.services import LookupService
        await LookupService.ensure_system_lookups(db)

        # Gather assigned roles
        role_stmt = (
            select(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user.id)
        )
        role_res = await db.execute(role_stmt)
        user_roles = role_res.scalars().all()
        role_codes = [r.code for r in user_roles]
        role_ids = [r.id for r in user_roles]

        # Gather assigned permissions
        permission_codes = set()
        if role_ids:
            perm_stmt = (
                select(Permission.code)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .where(RolePermission.role_id.in_(role_ids))
            )
            perm_res = await db.execute(perm_stmt)
            for p_code in perm_res.scalars().all():
                permission_codes.add(p_code)

        # Ensure role-based fallbacks in token claims
        if any(r in ["ADMIN", "PRINCIPAL", "SUPERADMIN"] for r in role_codes):
            all_p = await db.execute(select(Permission.code))
            for p_c in all_p.scalars().all():
                permission_codes.add(p_c)
        if "TEACHER" in role_codes:
            for p_c in [
                "attendance:view", "attendance:mark", "students:view", "academics:manage",
                "academics:view", "development:evaluate", "documents:generate", "reports:view",
                "notifications:send", "auth:login"
            ]:
                permission_codes.add(p_c)
        if "ACCOUNTANT" in role_codes:
            for p_c in [
                "fees:view", "fees:collect", "fees:reverse", "fees:view_reports",
                "finance:view", "finance:voucher_create", "students:view", "reports:view", "auth:login"
            ]:
                permission_codes.add(p_c)
        if any(r in ["PARENT", "STUDENT"] for r in role_codes):
            for p_c in ["students:view", "attendance:view", "fees:view", "reports:view", "auth:login"]:
                permission_codes.add(p_c)

        perm_list = list(permission_codes)

        # Generate scoped tokens
        token_claims = {
            "tenant_slug": tenant_slug,
            "user_type": user.user_type,
            "roles": role_codes,
            "permissions": perm_list,
        }

        access_token = create_access_token(subject=user.id, claims=token_claims)
        refresh_token = create_refresh_token(subject=user.id, claims={"tenant_slug": tenant_slug})

        return user, role_codes, perm_list, access_token, refresh_token

