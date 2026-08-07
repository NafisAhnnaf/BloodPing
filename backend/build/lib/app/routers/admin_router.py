from fastapi import APIRouter, Depends, status
from app.core.auth import require_admin
from app.services.admin_service import AdminService
from app.schemas.admin_schema import ApplicationReview

router = APIRouter(prefix="/admins", tags=["Admins"])


@router.get("/applications")
def get_donor_applications(admin_id: str = Depends(require_admin)):
    return AdminService.get_all_applications(admin_id)


@router.post("/applications/{id}/review")
def review_donor_application(
    id: str, data: ApplicationReview, admin_id: str = Depends(require_admin)
):
    AdminService.review_application(
        admin_id=admin_id,
        application_id=id,
        status=data.status,
        rejection_reason=data.rejection_reason,
    )
    return {"message": f"Application has been successfully {data.status}."}
