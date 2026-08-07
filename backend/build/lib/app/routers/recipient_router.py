from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import requireAuth
from app.services.recipient_service import RecipientService

router = APIRouter(prefix="/recipients", tags=["Recipients"])


@router.get("/me")
def get_recipient_details(user_id: str = Depends(requireAuth)):
    details = RecipientService.get_recipient_details(user_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient profile not found."
        )
    return details
