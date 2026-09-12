from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.auth import requireAuth
from app.services.leaderboard_service import LeaderboardService

from app.schemas.leaderboard_schema import LeaderboardEntry, DonorRankResponse

# Response Wrappers
class LeaderboardListResponse(BaseModel):
    success: bool = True
    payload: List[LeaderboardEntry]

class DonorRankAPIResponse(BaseModel):
    success: bool = True
    payload: DonorRankResponse

# Router setup
router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/", response_model=LeaderboardListResponse)
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    blood_group: Optional[str] = None
):
    """
    Get donor leaderboard. Calls PL/pgSQL function: get_donor_leaderboard
    """
    try:
        entries = await LeaderboardService.get_leaderboard(limit=limit, blood_group=blood_group)
        return {"success": True, "payload": entries}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch leaderboard: {str(e)}"
        )

@router.get("/donor/{donor_id}", response_model=DonorRankAPIResponse)
async def get_donor_rank(
    donor_id: str,
    current_user: str = Depends(requireAuth)
):
    """
    Get specific donor's rank and stats. Requires authentication.
    """
    try:
        stats = await LeaderboardService.get_donor_rank(donor_id=donor_id)
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donor not found."
            )
        return {"success": True, "payload": stats}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch donor rank: {str(e)}"
        )
