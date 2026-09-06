from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_records: int
    total_pages: int
    has_next: bool
    has_prev: bool


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "Operation completed successfully"
    meta: Optional[Dict[str, Any]] = None


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    message: str = "Records retrieved successfully"
    meta: PaginationMeta


def success_response(
    data: Any = None,
    message: str = "Operation completed successfully",
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "message": message,
        "meta": meta or {},
    }


def paginated_response(
    items: List[Any],
    page: int,
    limit: int,
    total_records: int,
    message: str = "Records retrieved successfully",
) -> Dict[str, Any]:
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1
    return {
        "success": True,
        "data": items,
        "message": message,
        "meta": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }


# ==========================================
# Reusable Dependency Guard
# ==========================================
from dataclasses import dataclass
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status


@dataclass
class DependencyRule:
    model: Any
    column: Any
    label: str


async def check_dependencies(
    db: AsyncSession,
    resource_id: str,
    resource_name: str,
    rules: List[DependencyRule],
) -> None:
    """
    Checks each dependency rule for active records pointing to resource_id.
    If any linked records exist, raises a structured HTTPException with exact counts.
    """
    dependencies = []
    for rule in rules:
        stmt = select(func.count()).select_from(rule.model).where(rule.column == resource_id)
        result = await db.execute(stmt)
        count = result.scalar_one() or 0
        if count > 0:
            dependencies.append({"resource": rule.label, "count": count})

    if dependencies:
        total = sum(d["count"] for d in dependencies)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": f"Cannot delete {resource_name} because {total} linked record(s) are currently in use.",
                "error_code": "RECORD_HAS_DEPENDENCIES",
                "dependencies": dependencies,
            },
        )

