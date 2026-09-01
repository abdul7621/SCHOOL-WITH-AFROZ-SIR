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
        raise PermissionDeniedException(f"Token is valid for tenant '{token_tenant_slug}', not '{request_tenant_slug}'")

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
    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    async def __call__(self, user: CurrentTenantUser = Depends(get_current_user)):
        # Master Administrator role bypasses granular check
        if "ADMIN" in user.roles:
            return user

        if self.permission_code not in user.permissions:
            raise PermissionDeniedException(self.permission_code)

        return user
