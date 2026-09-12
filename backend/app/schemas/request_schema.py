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

class BloodRequestUpdate(BaseModel):
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

class BloodRequestItem(BaseModel):
    id: str
    blood_group: str
    units_required: int
    units_fulfilled: int
    hospital_name: str
    hospital_lat: Optional[float] = None
    hospital_lng: Optional[float] = None
    hospital_address: Optional[str] = None
    search_radius_km: float = 10.0
    is_urgent: bool = False
    notes: Optional[str] = None
    required_by: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None

class FeedRequestItem(BaseModel):
    id: str
    blood_group: str
    units_required: int
    units_fulfilled: int
    hospital_name: str
    hospital_lat: Optional[float] = None
    hospital_lng: Optional[float] = None
    hospital_address: Optional[str] = None
    search_radius_km: float = 10.0
    is_urgent: bool = False
    notes: Optional[str] = None
    required_by: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    distance_km: float = 0.0
    match_score: Optional[float] = None

class RequestStatusSummary(BaseModel):
    request_status: str
    units_required: int
    units_fulfilled: int
    pending_donors_count: int
    accepted_donors_count: int

class RequestHistoryItem(BaseModel):
    match_id: str
    donor_id: str
    donor_name: str
    donor_blood_group: str
    match_status: str
    applied_at: Optional[str] = None
    accepted_at: Optional[str] = None
    confirmed_at: Optional[str] = None

