from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, Dict, List


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="Administrator account password")


class ApplicationReviewRequest(BaseModel):
    status: str = Field(..., description="Review action, must be 'approved' or 'rejected'")
    rejection_reason: Optional[str] = Field(None, description="Optional rejection reason")


class BanUserRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Detailed reason for suspending the user account")


class AdminApiResponse(BaseModel):
    success: bool = True
    payload: Optional[Any] = None
    message: str = ""
