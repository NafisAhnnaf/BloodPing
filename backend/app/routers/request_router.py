from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import requireAuth
from app.services.request_service import RequestService
from app.schemas.request_schema import (
    BloodRequestCreate,
    BloodRequestUpdate,
    StandardResponse,
)

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.get("/get-requests", response_model=StandardResponse)
def get_requests(user_id: str = Depends(requireAuth)):
    """Retrieves all public blood donation requests."""
    requests_list = RequestService.get_all_requests()
    return {
        "success": True,
        "message": "All blood donation requests retrieved successfully.",
        "payload": {"requests": requests_list}
    }


@router.get("/active", response_model=StandardResponse)
def get_active_requests(user_id: str = Depends(requireAuth)):
    """Retrieves open, unexpired donation requests."""
    active_list = RequestService.get_active_requests()
    return {
        "success": True,
        "message": "Active donation requests retrieved successfully.",
        "payload": {"requests": active_list}
    }


@router.get("/my-requests", response_model=StandardResponse)
def get_my_requests(user_id: str = Depends(requireAuth)):
    """Retrieves all blood donation requests created by the authenticated recipient."""
    recipient_requests = RequestService.get_recipient_requests(user_id)
    return {
        "success": True,
        "message": "Recipient blood donation requests retrieved successfully.",
        "payload": {"requests": recipient_requests}
    }


@router.post("/request-blood", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def request_blood(request_data: BloodRequestCreate, user_id: str = Depends(requireAuth)):
    """Creates a new blood donation request for the authenticated user."""
    new_request = RequestService.create_request(user_id, request_data)
    return {
        "success": True,
        "message": "Successfully created blood donation request.",
        "payload": {"request": new_request}
    }


@router.get("/{request_id}", response_model=StandardResponse)
def get_request_by_id(request_id: str, user_id: str = Depends(requireAuth)):
    """Retrieves details of a specific blood donation request."""
    request_details = RequestService.get_request_by_id(request_id)
    return {
        "success": True,
        "message": "Donation request details retrieved successfully.",
        "payload": {"request": request_details}
    }


@router.get("/{request_id}/status", response_model=StandardResponse)
def get_request_status(request_id: str, user_id: str = Depends(requireAuth)):
    """Retrieves aggregate donor applicant and fulfillment counts for a request."""
    status_summary = RequestService.get_request_status(request_id)
    return {
        "success": True,
        "message": "Request status summary retrieved successfully.",
        "payload": {"status": status_summary}
    }


@router.get("/{request_id}/history", response_model=StandardResponse)
def get_request_history(request_id: str, user_id: str = Depends(requireAuth)):
    """Retrieves all donor applications and match statuses for a request."""
    history = RequestService.get_request_history(request_id)
    return {
        "success": True,
        "message": "Request applicant history retrieved successfully.",
        "payload": {"history": history}
    }


@router.put("/{request_id}", response_model=StandardResponse)
def update_request(
    request_id: str,
    request_data: BloodRequestUpdate,
    user_id: str = Depends(requireAuth)
):
    """Updates an open donation request (restricted to owning recipient)."""
    updated_request = RequestService.update_request(user_id, request_id, request_data)
    return {
        "success": True,
        "message": "Donation request updated successfully.",
        "payload": {"request": updated_request}
    }


@router.patch("/{request_id}/cancel", response_model=StandardResponse)
def cancel_request(request_id: str, user_id: str = Depends(requireAuth)):
    """Cancels an open donation request (restricted to owning recipient)."""
    cancelled_request = RequestService.cancel_request(user_id, request_id)
    return {
        "success": True,
        "message": "Donation request cancelled successfully.",
        "payload": {"request": cancelled_request}
    }


@router.patch("/{request_id}/fulfill", response_model=StandardResponse)
def mark_request_fulfilled(request_id: str, user_id: str = Depends(requireAuth)):
    """Manually marks a donation request as fulfilled (restricted to owning recipient)."""
    fulfilled_request = RequestService.mark_request_fulfilled(user_id, request_id)
    return {
        "success": True,
        "message": "Donation request marked as fulfilled.",
        "payload": {"request": fulfilled_request}
    }
