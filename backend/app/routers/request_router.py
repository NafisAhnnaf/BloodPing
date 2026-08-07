from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import requireAuth
from app.services.request_service import RequestService
from app.schemas.request_schema import BloodRequestCreate, StandardResponse

router = APIRouter(prefix="/requests", tags=["Requests"])

@router.get("/get-requests", response_model=StandardResponse)
def get_requests(user_id: str = Depends(requireAuth)):
    requests_list = RequestService.get_all_requests()
    return {
        "success": True,
        "message": "All blood donation requests retrieved successfully.",
        "payload": {"requests": requests_list}
    }

@router.post("/request-blood", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def request_blood(request_data: BloodRequestCreate, user_id: str = Depends(requireAuth)):
    new_request = RequestService.create_request(user_id, request_data)
    return {
        "success": True,
        "message": "Successfully created blood donation request.",
        "payload": {"request": new_request}
    }
