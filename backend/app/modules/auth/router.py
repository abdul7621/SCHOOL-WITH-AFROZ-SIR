from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_tenant_db
from app.core.security import decode_token, create_access_token
from app.core.exceptions import InvalidCredentialsException
from app.shared.responses import success_response
from app.middlewares.auth_middleware import get_current_user, CurrentTenantUser
from app.modules.auth.schemas import (
    TenantLoginRequest,
    TenantLoginResponse,
    RefreshTokenRequest,
    UserProfileResponse,
)
from app.modules.auth.services import AuthService

router = APIRouter(prefix="/auth", tags=["Tenant Authentication"])


@router.post("/login", response_model=TenantLoginResponse)
async def tenant_login(
    req: TenantLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Tenant-scoped user login. Authenticates against the active tenant database
    and returns scoped JWT tokens containing role & permission claims.
    """
    tenant_slug = getattr(request.state, "tenant_slug", "unknown")
    user, roles, permissions, access_token, refresh_token = await AuthService.authenticate_tenant_user(
        db=db,
        username_or_phone=req.username_or_phone,
        password=req.password,
        tenant_slug=tenant_slug,
    )

    return TenantLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        username=user.username,
        user_type=user.user_type,
        roles=roles,
        permissions=permissions,
    )


@router.post("/refresh")
async def refresh_access_token(
    req: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Refreshes short-lived access token using valid refresh token and preserves RBAC permissions."""
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise InvalidCredentialsException("Invalid token type: refresh token expected")

    user_id = payload.get("sub")
    tenant_slug = payload.get("tenant_slug")
    request_tenant_slug = getattr(request.state, "tenant_slug", None)

    if request_tenant_slug and tenant_slug != request_tenant_slug:
        raise InvalidCredentialsException("Refresh token tenant mismatch")

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.users_rbac.models import User, Role

    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id, User.is_active == True)
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise InvalidCredentialsException("User account not found or inactive")

    roles = [r.name for r in user.roles if r.is_active]
    permissions_set = set()
    for r in user.roles:
        if r.is_active:
            for p in r.permissions:
                permissions_set.add(p.code)

    new_access_token = create_access_token(
        subject=user.id,
        claims={
            "tenant_slug": tenant_slug,
            "user_type": user.user_type,
            "roles": roles,
            "permissions": list(permissions_set),
        },
    )

    return success_response(
        data={"access_token": new_access_token, "token_type": "bearer"},
        message="Token refreshed successfully",
    )


@router.get("/me")
async def get_current_user_profile(user: CurrentTenantUser = Depends(get_current_user)):
    """Returns profile and authorized permission list of the current logged-in user."""
    return success_response(
        data={
            "user_id": user.id,
            "tenant_slug": user.tenant_slug,
            "user_type": user.user_type,
            "roles": user.roles,
            "permissions": user.permissions,
        }
    )
