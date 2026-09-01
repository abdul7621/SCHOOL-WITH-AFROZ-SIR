from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DryRunValidationError(BaseModel):
    row_number: int
    field: str
    value: Any
    error_message: str


class ExcelDryRunResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    can_proceed: bool
    errors: List[DryRunValidationError] = []
    preview_data: List[Dict[str, Any]] = []


class ExcelCommitResponse(BaseModel):
    success: bool
    imported_count: int
    message: str
