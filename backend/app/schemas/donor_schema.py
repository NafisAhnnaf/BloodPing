from pydantic import BaseModel, Field, field_validator
from typing import Optional

VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


class DonorApplicationCreate(BaseModel):
    blood_group: str = Field(..., description="Target blood group, e.g. A+")
    travel_radius_km: float = Field(default=10.0, ge=1.0, le=100.0, description="Preferred travel radius in kilometers")
    document_url: str = Field(..., min_length=5, description="Supabase storage path/URL to verification certificate")

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if cleaned not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group '{v}'. Must be one of: {', '.join(sorted(VALID_BLOOD_GROUPS))}")
        return cleaned

    @field_validator("document_url")
    @classmethod
    def validate_document_url(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Document URL cannot be empty.")
        return cleaned


class DonorApplicationResponse(BaseModel):
    success: bool
    message: str
    application_id: str


class DonorApplicationStatus(BaseModel):
    has_applied: bool
    status: Optional[str] = None  # 'pending', 'approved', 'rejected'
    rejection_reason: Optional[str] = None
    application_id: Optional[str] = None
    blood_group: Optional[str] = None
    travel_radius_km: Optional[float] = None
    document_url: Optional[str] = None
    applied_at: Optional[str] = None
    reviewed_at: Optional[str] = None


class DonorDetails(BaseModel):
    id: str
    user_id: str
    blood_group: str
    is_available: bool
    travel_radius_km: float
    rest_period_until: Optional[str] = None
    total_donations: int
    current_streak: int
    longest_streak: int
    last_donation_at: Optional[str] = None
    total_points: int = 0
    is_platform_verified: bool = True
    created_at: str
    updated_at: str
