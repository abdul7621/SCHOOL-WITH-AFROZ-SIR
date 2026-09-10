from typing import List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.exceptions import InvalidCredentialsException
from app.modules.users_rbac.models import User, Role, Permission
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
        staff_stmt = select(StaffProfile.user_id).where(
            func.lower(StaffProfile.employee_id) == clean_input.lower(),
            StaffProfile.is_active == True,
        )
        staff_res = await db.execute(staff_stmt)
        matched_user_id = staff_res.scalar_one_or_none()

        stmt = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions)
            )
            .where(
                (func.lower(User.username) == clean_input.lower()) |
                (User.phone == clean_input) |
                (func.lower(User.email) == clean_input.lower()) |
                (User.id == matched_user_id if matched_user_id else False),
                User.is_active == True,
            )
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(clean_password, user.password_hash):
            raise InvalidCredentialsException("Invalid username/phone or password")

        # Collect unique roles and permissions
        role_codes = [r.code for r in user.roles]
        permission_codes = set()
        for r in user.roles:
            for p in r.permissions:
                permission_codes.add(p.code)

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

