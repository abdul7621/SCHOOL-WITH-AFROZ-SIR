from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from app.core.logging import logger


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Process the request
        response = await call_next(request)

        # Log mutating actions asynchronously
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            tenant_slug = getattr(request.state, "tenant_slug", "control_plane")
            user_id = getattr(request.state, "current_user_id", "anonymous")
            user_role = getattr(request.state, "current_user_role", "none")
            client_ip = request.client.host if request.client else "unknown"

            # Sensitive paths masking
            path = request.url.path
            if not path.endswith("/login") and not path.endswith("/refresh"):
                logger.info(
                    f"AUDIT | Tenant: {tenant_slug} | User: {user_id} ({user_role}) | "
                    f"Action: {request.method} {path} | Status: {response.status_code} | IP: {client_ip}"
                )

        return response
