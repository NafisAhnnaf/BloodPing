from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class LeaderboardEntry(BaseModel):
    donor_id: UUID
    full_name: str
    username: str
    avatar_url: Optional[str] = None
    blood_group: str
    total_donations: int
    current_streak: int
    longest_streak: int
    total_points: Optional[int] = 0
    badge: Optional[str] = None
    last_donation_at: Optional[str] = None
    rank_overall: int
    rank_by_blood_group: Optional[int] = None

class DonorRankResponse(BaseModel):
    donor_id: UUID
    full_name: str
    username: str
    avatar_url: Optional[str] = None
    blood_group: str
    total_donations: int
    current_streak: int
    longest_streak: int
    total_points: Optional[int] = 0
    badge: Optional[str] = None
    last_donation_at: Optional[str] = None
    rank_overall: int
    rank_by_blood_group: Optional[int] = None
