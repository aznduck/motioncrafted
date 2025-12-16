"""
Admin authentication endpoint
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.admin import AdminLoginRequest, AdminLoginResponse
from app.core.security import verify_password, create_access_token
from app.core.database import get_db

router = APIRouter()


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """
    Admin login endpoint

    Authenticates admin user and returns JWT token

    Args:
        request: Login credentials (email + password)

    Returns:
        JWT access token

    Raises:
        401: If credentials are invalid
    """
    db = get_db()

    # Fetch admin user from database
    try:
        result = db.table('admin_users').select('*').eq('email', request.email).single().execute()
        admin_user = result.data

        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(request.password, admin_user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Create JWT token
    token_data = {
        "sub": admin_user['id'],
        "email": admin_user['email'],
        "role": "admin"
    }

    access_token = create_access_token(token_data)

    return AdminLoginResponse(
        access_token=access_token,
        token_type="bearer"
    )
