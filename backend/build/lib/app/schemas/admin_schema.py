from pydantic import BaseModel, Field
from typing import Optional


class ApplicationReview(BaseModel):
    status: str = Field(..., description="Review action, must be 'approved' or 'rejected'")
    rejection_reason: Optional[str] = None
