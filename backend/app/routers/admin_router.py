from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.core.auth import requireAdmin
from app.services.admin_service import AdminService
from app.schemas.admin_schema import (
    AdminLoginRequest,
    ApplicationReviewRequest,
    BanUserRequest,
    RoleRemovalRequest,
    AdminApiResponse,
)

router = APIRouter(prefix="/admins", tags=["Admin"])


@router.post("/login", response_model=AdminApiResponse)
async def admin_login(data: AdminLoginRequest):
    """
    Authenticate administrator credentials and return access token.
    Public endpoint.
    """
    try:
        payload = await AdminService.admin_login(email=str(data.email), password=data.password)
        return AdminApiResponse(
            success=True,
            payload=payload,
            message="Administrator authentication successful."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during admin login: {str(e)}"
        )


@router.get("/applications", response_model=AdminApiResponse)
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected, or all"),
    sort: Optional[str] = Query("newest", description="Sorting order: newest or oldest"),
    search: Optional[str] = Query(None, description="Search term for full name, email, or blood group"),
    admin_id: str = Depends(requireAdmin)
):
    """
    Retrieve donor candidate applications with filtering, sorting, and search capabilities.
    Admin only.
    """
    try:
        applications = await AdminService.get_applications(
            status_filter=status,
            sort=sort,
            search=search
        )
        return AdminApiResponse(
            success=True,
            payload=applications,
            message="Donor applications retrieved successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while retrieving applications: {str(e)}"
        )


@router.post("/applications/{id}/review", response_model=AdminApiResponse)
async def review_application(
    id: str,
    data: ApplicationReviewRequest,
    admin_id: str = Depends(requireAdmin)
):
    """
    Review (approve or reject) a donor application.
    Admin only.
    """
    try:
        res = await AdminService.review_application(
            application_id=id,
            admin_id=admin_id,
            status_val=data.status,
            rejection_reason=data.rejection_reason
        )
        return AdminApiResponse(
            success=True,
            payload=res,
            message=f"Application has been successfully {data.status}."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while reviewing application: {str(e)}"
        )


@router.get("/users", response_model=AdminApiResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name, username, or email"),
    filter: str = Query("all", description="Filter type: all, active, banned, donors, recipients"),
    admin_id: str = Depends(requireAdmin)
):
    """
    Retrieve paginated list of user accounts with search and status filtering.
    Admin only.
    """
    try:
        users_payload = await AdminService.get_users(
            page=page,
            limit=limit,
            search=search,
            filter_type=filter
        )
        return AdminApiResponse(
            success=True,
            payload=users_payload,
            message="Users retrieved successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while retrieving users: {str(e)}"
        )


@router.post("/users/{id}/ban", response_model=AdminApiResponse)
async def ban_user(
    id: str,
    data: BanUserRequest,
    admin_id: str = Depends(requireAdmin)
):
    """
    Suspend (ban) a user account, revoking active sessions and notifying the user.
    Admin only.
    """
    try:
        res = await AdminService.ban_user(
            user_id=id,
            admin_id=admin_id,
            reason=data.reason
        )
        return AdminApiResponse(
            success=True,
            payload=res,
            message="User suspended successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while suspending user: {str(e)}"
        )


@router.post("/users/{id}/unban", response_model=AdminApiResponse)
async def unban_user(
    id: str,
    admin_id: str = Depends(requireAdmin)
):
    """
    Restore (unban) a user account and notify the user.
    Admin only.
    """
    try:
        res = await AdminService.unban_user(
            user_id=id,
            admin_id=admin_id
        )
        return AdminApiResponse(
            success=True,
            payload=res,
            message="User account restored successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while restoring user: {str(e)}"
        )


@router.post("/users/{id}/remove-donor", response_model=AdminApiResponse)
async def remove_donor(
    id: str,
    data: Optional[RoleRemovalRequest] = None,
    admin_id: str = Depends(requireAdmin)
):
    """
    Deactivate donor privileges for a user.
    Admin only.
    """
    try:
        reason = data.reason if data else None
        res = await AdminService.remove_donor_role(
            user_id=id,
            admin_id=admin_id,
            reason=reason
        )
        return AdminApiResponse(
            success=True,
            payload=res,
            message="Donor role removed successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while removing donor role: {str(e)}"
        )


@router.post("/users/{id}/remove-recipient", response_model=AdminApiResponse)
async def remove_recipient(
    id: str,
    data: Optional[RoleRemovalRequest] = None,
    admin_id: str = Depends(requireAdmin)
):
    """
    Deactivate recipient privileges for a user.
    Admin only.
    """
    try:
        reason = data.reason if data else None
        res = await AdminService.remove_recipient_role(
            user_id=id,
            admin_id=admin_id,
            reason=reason
        )
        return AdminApiResponse(
            success=True,
            payload=res,
            message="Recipient role removed successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while removing recipient role: {str(e)}"
        )

