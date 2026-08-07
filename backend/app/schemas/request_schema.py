from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class BloodRequestCreate(BaseModel):
    blood_group: str
    units_required: int
    hospital_name: str
    hospital_lat: float
    hospital_lng: float
    hospital_address: str
    search_radius_km: float = 10.0
    is_urgent: bool = False
    notes: Optional[str] = None
    required_by: datetime

class StandardResponse(BaseModel):
    success: bool
    message: str
    payload: Optional[Dict[str, Any]] = None
