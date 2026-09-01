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
