from typing import Optional, List
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token
from app.core.exceptions import InvalidCredentialsException, PermissionDeniedException

security_scheme = HTTPBearer(auto_error=False)


class CurrentTenantUser:
    def __init__(self, user_id: str, tenant_slug: str, user_type: str, roles: List[str], permissions: List[str]):
        self.id = user_id
        self.tenant_slug = tenant_slug
        self.user_type = user_type
        self.roles = roles
        self.permissions = permissions


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> CurrentTenantUser:
    """
    Extracts and validates JWT token, ensuring it is strictly bound to the active request tenant.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Authentication token missing", "error_code": "AUTH_REQUIRED"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    token_tenant_slug = payload.get("tenant_slug")
    request_tenant_slug = getattr(request.state, "tenant_slug", None)

    # Invariant: Token tenant must strictly match request tenant
    if request_tenant_slug and token_tenant_slug != request_tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": f"Session belongs to school '{token_tenant_slug}', not '{request_tenant_slug}'. Please log in.", "error_code": "TENANT_MISMATCH"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidCredentialsException("Invalid token payload: missing user ID")

    current_user = CurrentTenantUser(
        user_id=user_id,
        tenant_slug=token_tenant_slug,
        user_type=payload.get("user_type", "STAFF"),
        roles=payload.get("roles", []),
        permissions=payload.get("permissions", []),
    )

    request.state.current_user = current_user
    request.state.current_user_id = user_id
    request.state.current_user_role = current_user.roles[0] if current_user.roles else None

    return current_user


async def get_current_user_or_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> CurrentTenantUser:
    """
    Extracts and validates JWT token from Authorization header OR query param (?token=...),
    enforcing tenant matching. Used for printable document preview tabs.
    """
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    else:
        raw_token = request.query_params.get("token") or request.query_params.get("auth_token")

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Authentication token missing. Please log in to view documents.", "error_code": "AUTH_REQUIRED"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(raw_token)
    token_tenant_slug = payload.get("tenant_slug")
    request_tenant_slug = getattr(request.state, "tenant_slug", None)

    if request_tenant_slug and token_tenant_slug != request_tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": f"Session belongs to school '{token_tenant_slug}', not '{request_tenant_slug}'.", "error_code": "TENANT_MISMATCH"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise InvalidCredentialsException("Invalid token payload: missing user ID")

    current_user = CurrentTenantUser(
        user_id=user_id,
        tenant_slug=token_tenant_slug,
        user_type=payload.get("user_type", "STAFF"),
        roles=payload.get("roles", []),
        permissions=payload.get("permissions", []),
    )

    request.state.current_user = current_user
    request.state.current_user_id = user_id
    request.state.current_user_role = current_user.roles[0] if current_user.roles else None

    return current_user


class RequirePermission:
    def __init__(self, *permission_codes: str):
        self.permission_codes = permission_codes

    async def __call__(self, user: CurrentTenantUser = Depends(get_current_user)):
        # Master Administrator & Principal roles bypass granular check
        if any(r in ["ADMIN", "PRINCIPAL", "SUPERADMIN"] for r in user.roles):
            return user

        for p_code in self.permission_codes:
            if p_code in user.permissions:
                return user
            # Teacher fallback permissions
            if "TEACHER" in user.roles and p_code in [
                "attendance:view", "attendance:mark", "students:view", "academics:manage",
                "academics:view", "development:evaluate", "documents:generate", "reports:view",
                "notifications:send", "auth:login"
            ]:
                return user
            # Accountant fallback permissions
            if "ACCOUNTANT" in user.roles and p_code in [
                "fees:view", "fees:collect", "fees:reverse", "fees:view_reports",
                "finance:view", "finance:voucher_create", "students:view", "reports:view", "auth:login"
            ]:
                return user
            # Parent / Student fallback permissions
            if any(r in ["PARENT", "STUDENT"] for r in user.roles) and p_code in [
                "students:view", "attendance:view", "fees:view", "reports:view", "auth:login"
            ]:
                return user

        raise PermissionDeniedException(self.permission_codes[0] if self.permission_codes else "denied")
