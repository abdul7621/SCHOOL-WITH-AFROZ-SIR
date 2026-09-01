from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.exceptions import InvalidCredentialsException
from app.modules.users_rbac.models import User, Role, Permission


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
        """
        stmt = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions)
            )
            .where(
                (User.username == username_or_phone) | (User.phone == username_or_phone) | (User.email == username_or_phone),
                User.is_active == True,
            )
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
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
