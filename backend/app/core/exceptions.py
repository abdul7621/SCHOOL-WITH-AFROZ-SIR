from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        message: str = "An error occurred",
        error_code: str = "APP_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={"message": message, "error_code": error_code, "details": self.details},
        )


class TenantNotFoundException(AppException):
    def __init__(self, domain_or_slug: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Tenant not found for '{domain_or_slug}'",
            error_code="TENANT_NOT_FOUND",
            details={"identifier": domain_or_slug},
        )


class TenantSuspendedException(AppException):
    def __init__(self, tenant_slug: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=f"Tenant '{tenant_slug}' is suspended or undergoing maintenance",
            error_code="TENANT_SUSPENDED",
            details={"tenant_slug": tenant_slug},
        )


class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="INVALID_CREDENTIALS",
        )


class PermissionDeniedException(AppException):
    def __init__(self, required_permission: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=f"You do not have permission '{required_permission}' to perform this action",
            error_code="PERMISSION_DENIED",
            details={"required_permission": required_permission},
        )


class ResourceNotFoundException(AppException):
    def __init__(self, resource_name: str, resource_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource_name} with identifier '{resource_id}' not found",
            error_code="RESOURCE_NOT_FOUND",
            details={"resource": resource_name, "id": str(resource_id)},
        )


class FinancialImmutabilityException(AppException):
    def __init__(self, message: str = "Destructive deletion of confirmed financial records is prohibited. Use reversal instead."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            error_code="FINANCIAL_IMMUTABILITY_VIOLATION",
        )


class BusinessRuleViolationException(AppException):
    def __init__(self, message: str, rule_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            error_code=rule_code,
        )
