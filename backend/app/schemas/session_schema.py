from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SessionRecord(BaseModel):
    session_id: str
    ip_address: str
    mac_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[str] = None
    last_active_at: Optional[str] = None
    is_active: bool = True
    is_current: bool = False


class SessionRecordPayload(BaseModel):
    mac_address: Optional[str] = Field(None, description="Optional client MAC address for native clients")


class PasswordVerifyRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Password required to authorize global session revocation")


class StandardResponse(BaseModel):
    success: bool = True
    code: int = 200
    message: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)
