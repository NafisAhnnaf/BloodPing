from pydantic import BaseModel
from typing import Optional, Dict, Any


class MatchApplyRequest(BaseModel):
    donor_id: Optional[str] = None


class MatchStatusUpdate(BaseModel):
    status: str
    recipient_verification_note: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    payload: Optional[Dict[str, Any]] = None
