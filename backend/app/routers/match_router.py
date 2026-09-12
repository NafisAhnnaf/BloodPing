from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import requireAuth
from app.services.match_service import MatchService
from app.schemas.match_schema import MatchApplyRequest, MatchStatusUpdate, StandardResponse

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.post("/{request_id}/apply", response_model=StandardResponse)
def apply_to_request(request_id: str, data: MatchApplyRequest, user_id: str = Depends(requireAuth)):
    match_id = MatchService.apply_to_request(request_id, data.donor_id)
    return {
        "success": True,
        "message": "Successfully applied to donation request.",
        "payload": {"match_id": match_id, "status": "pending"}
    }

@router.get("/{request_id}/applications", response_model=StandardResponse)
def get_applications(request_id: str, user_id: str = Depends(requireAuth)):
    matches = MatchService.get_applications(request_id)
    return {
        "success": True,
        "message": "Applications retrieved successfully.",
        "payload": {"applications": matches}
    }

@router.get("/donor/{donor_id}", response_model=StandardResponse)
def get_donor_matches(donor_id: str, match_status: str = None, user_id: str = Depends(requireAuth)):
    matches = MatchService.get_donor_matches(donor_id, match_status)
    return {
        "success": True,
        "message": "Matches retrieved successfully.",
        "payload": {"matches": matches}
    }

@router.put("/{match_id}/status", response_model=StandardResponse)
def update_match_status(match_id: str, data: MatchStatusUpdate, user_id: str = Depends(requireAuth)):
    MatchService.update_match_status(match_id, data.status, data.recipient_verification_note)
    return {
        "success": True,
        "message": f"Match status updated to {data.status}.",
        "payload": {"match_id": match_id, "status": data.status}
    }

@router.post("/{match_id}/confirm-donation", response_model=StandardResponse)
def confirm_donation(match_id: str, user_id: str = Depends(requireAuth)):
    MatchService.confirm_donation(match_id)
    return {
        "success": True,
        "message": "Donation confirmed successfully.",
        "payload": {"match_id": match_id, "status": "confirmed"}
    }

@router.delete("/{match_id}/withdraw", response_model=StandardResponse)
def withdraw_application(match_id: str, user_id: str = Depends(requireAuth)):
    MatchService.withdraw_application(match_id)
    return {
        "success": True,
        "message": "Application withdrawn successfully.",
        "payload": {"match_id": match_id}
    }
