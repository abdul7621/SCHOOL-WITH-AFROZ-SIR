from typing import Any, Dict, Optional
from pydantic import BaseModel


class SystemSettingUpdate(BaseModel):
    setting_key: str
    setting_value: Any
    is_public: bool = False
    description: Optional[str] = None


class SystemSettingResponse(BaseModel):
    id: str
    setting_key: str
    setting_value: Any
    is_public: bool
    description: Optional[str] = None

    class Config:
        from_attributes = True
