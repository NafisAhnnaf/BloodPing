from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class UserList(BaseModel):
    full_name: str
    username: str
    email: str


class UserDetails(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    date_of_birth: Optional[str] = None  # Consider using date type if needed
    phone: Optional[str] = None
    bio: Optional[str] = None
    blood_group: Optional[str] = None
    travel_radius_km: Optional[float] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    role: Optional[str] = None
