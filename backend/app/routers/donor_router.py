from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import requireAuth
from app.services.donor_service import DonorService
from app.schemas.donor_schema import (
    DonorApplicationCreate, 
    DonorApplicationResponse,
    DonorApplicationStatus, 
    DonorDetails,
    DonorDocumentItem,
    DonorDocumentUpload,
    DonorAvailabilityUpdate,
    DonorAvailabilityResponse,
)

router = APIRouter(prefix="/donors", tags=["Donors"])


@router.post("/apply", response_model=DonorApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_be_donor(
    data: DonorApplicationCreate, user_id: str = Depends(requireAuth)
):
    """Submits a candidate donor application for verification."""
    app_id = DonorService.apply_to_be_donor(
        user_id=user_id,
        blood_group=data.blood_group,
        travel_radius_km=data.travel_radius_km,
        document_url=data.document_url,
    )
    return DonorApplicationResponse(
        success=True,
        message="Application submitted successfully. Awaiting admin review.",
        application_id=app_id
    )


@router.get("/status", response_model=DonorApplicationStatus)
def get_application_status(user_id: str = Depends(requireAuth)):
    """Retrieves the authenticated user's latest donor application status."""
    return DonorService.get_application_status(user_id)


@router.get("/me", response_model=DonorDetails)
def get_donor_details(user_id: str = Depends(requireAuth)):
    """Retrieves verified donor details for the authenticated user. Raises 404 if user is not a donor."""
    details = DonorService.get_donor_details(user_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found."
        )
    return details


@router.get("/documents", response_model=List[DonorDocumentItem])
def get_donor_documents(user_id: str = Depends(requireAuth)):
    """Retrieves all verification documents and medical records uploaded by the donor."""
    return DonorService.get_donor_documents(user_id)


@router.post("/documents", status_code=status.HTTP_201_CREATED)
def upload_medical_document(
    data: DonorDocumentUpload, user_id: str = Depends(requireAuth)
):
    """Uploads an additional medical document for the authenticated donor."""
    return DonorService.upload_medical_document(
        user_id=user_id,
        document_type=data.document_type,
        storage_url=data.storage_url,
        document_date=data.document_date,
    )


@router.get("/availability", response_model=DonorAvailabilityResponse)
def get_donor_availability(user_id: str = Depends(requireAuth)):
    """Retrieves the donor availability toggle and rest period status."""
    return DonorService.get_donor_availability(user_id)


@router.put("/availability", response_model=DonorAvailabilityResponse)
def update_donor_availability(
    data: DonorAvailabilityUpdate, user_id: str = Depends(requireAuth)
):
    """Updates the donor emergency availability toggle."""
    return DonorService.update_donor_availability(user_id, data.is_available)
