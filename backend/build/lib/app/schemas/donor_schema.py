from pydantic import BaseModel, Field
from typing import Optional


class DonorApplicationCreate(BaseModel):
    blood_group: str = Field(..., description="Target blood group, e.g. A+")
    travel_radius_km: float = Field(default=10.0, ge=1.0, le=200.0)
    document_url: str = Field(..., description="Supabase storage path/URL to verification certificate")


class DonorApplicationStatus(BaseModel):
    has_applied: bool
    status: Optional[str] = None
    rejection_reason: Optional[str] = None


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
    created_at: str
    updated_at: str
