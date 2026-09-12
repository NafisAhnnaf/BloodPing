from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.core.auth import requireAuth, requireAdmin
from app.services.leaderboard_service import LeaderboardService

from app.schemas.leaderboard_schema import LeaderboardEntry, DonorRankResponse

# Pydantic Request Models
class AwardPointsRequest(BaseModel):
    donor_id: str
    match_id: Optional[str] = None
    action_type: str
    points: int
    description: Optional[str] = None

# Response Wrappers
class LeaderboardListResponse(BaseModel):
    success: bool = True
    payload: List[LeaderboardEntry]

class DonorRankAPIResponse(BaseModel):
    success: bool = True
    payload: DonorRankResponse

class PointsSummaryResponse(BaseModel):
    success: bool = True
    payload: Dict[str, Any]

class AwardPointsAPIResponse(BaseModel):
    success: bool = True
    payload: Dict[str, Any]

# Router setup
router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/", response_model=LeaderboardListResponse)
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    blood_group: Optional[str] = None
):
    """
    Get donor leaderboard. Calls PL/pgSQL function: get_donor_leaderboard_with_points
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

@router.get("/points/{donor_id}", response_model=PointsSummaryResponse)
async def get_donor_points(
    donor_id: str,
    current_user: str = Depends(requireAuth)
):
    """
    Get donor points summary and transaction history. Requires authentication.
    """
    try:
        data = await LeaderboardService.get_donor_points(donor_id=donor_id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donor points record not found."
            )
        return {"success": True, "payload": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch donor points: {str(e)}"
        )

@router.post("/points/award", response_model=AwardPointsAPIResponse)
async def award_points_manually(
    request_data: AwardPointsRequest,
    current_user: str = Depends(requireAdmin)
):
    """
    Manually award or deduct points for a donor (Admin only).
    """
    try:
        result = await LeaderboardService.award_points(
            donor_id=request_data.donor_id,
            match_id=request_data.match_id,
            action_type=request_data.action_type,
            points=request_data.points,
            description=request_data.description
        )
        return {"success": True, "payload": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award points: {str(e)}"
        )
