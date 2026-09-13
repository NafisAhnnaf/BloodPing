from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from app.services.user_service import UserService
from app.schemas.user_schema import UserDetails, UserList  # (or defined at top of file)
from app.core.auth import requireAuth

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=List[UserList])
def get_users():
    return UserService.get_all_users()


@router.get("/me", response_model=UserDetails)
def get_current_user(user_id: str = Depends(requireAuth)):
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found."
        )
    return user


@router.get("/{user_id}", response_model=UserDetails)
def get_user(user_id: str):  # Note: user_id is UUID (represented as str in Pydantic/FastAPI)
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.post("/", response_model=UserDetails, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserDetails):
    try:
        return UserService.create_user(user_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user."
        )


@router.put("/", response_model=UserDetails, status_code=status.HTTP_200_OK)
def update_user(user_data: UserDetails, user_id: str = Depends(requireAuth)):
    try:
        return UserService.update_user(user_id, user_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update user."
        )


@router.get("/me/export")
def export_user_data(user_id: str = Depends(requireAuth)):
    """Exports personal data archive for the authenticated user."""
    return UserService.export_user_data(user_id)


@router.delete("/me")
def delete_user_account(user_id: str = Depends(requireAuth)):
    """Permanently deletes the authenticated user's profile and related records."""
    return UserService.delete_user_account(user_id)

