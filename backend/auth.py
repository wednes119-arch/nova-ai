import os
import random
import smtplib

from email.message import EmailMessage
from datetime import datetime, timedelta

from dotenv import load_dotenv

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from passlib.context import CryptContext
from jose import jwt, JWTError

from fastapi.security import (
    OAuth2PasswordRequestForm,
    OAuth2PasswordBearer
)

from database import get_db
from models import User
from schemas import UserSignup


load_dotenv()


router = APIRouter()


# =====================================================
# SECURITY
# =====================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = "nova_ai_super_secret_key_change_later"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)


# =====================================================
# EMAIL CONFIG
# =====================================================

SMTP_EMAIL = os.getenv("SMTP_EMAIL")

SMTP_APP_PASSWORD = os.getenv(
    "SMTP_APP_PASSWORD"
)

SMTP_SERVER = "smtp.gmail.com"

SMTP_PORT = 587


# =====================================================
# CREATE JWT
# =====================================================

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# =====================================================
# GENERATE OTP
# =====================================================

def generate_otp():

    return str(
        random.randint(100000, 999999)
    )


# =====================================================
# SEND OTP EMAIL
# =====================================================

def send_otp_email(
    recipient_email: str,
    otp: str
):

    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:

        raise Exception(
            "SMTP email configuration is missing."
        )

    message = EmailMessage()

    message["Subject"] = "Nova AI - Email Verification Code"

    message["From"] = SMTP_EMAIL

    message["To"] = recipient_email

    message.set_content(
        f"""
Hello,

Welcome to Nova AI!

Your email verification code is:

{otp}

This code will expire in 5 minutes.

If you did not create a Nova AI account,
you can safely ignore this email.

Regards,
Nova AI Team
"""
    )

    with smtplib.SMTP(
        SMTP_SERVER,
        SMTP_PORT
    ) as server:

        server.starttls()

        server.login(
            SMTP_EMAIL,
            SMTP_APP_PASSWORD
        )

        server.send_message(message)


# =====================================================
# SIGNUP
# =====================================================

@router.post("/signup")
def signup(
    user: UserSignup,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(User)
        .filter(
            User.email == user.email
        )
        .first()
    )

    # -------------------------------------------------
    # Existing verified user
    # -------------------------------------------------

    if existing_user and existing_user.is_verified:

        return {
            "status": "error",
            "message": "Email already registered"
        }

    # -------------------------------------------------
    # Existing unverified user
    # -------------------------------------------------

    if existing_user:

        otp = generate_otp()

        hashed_otp = pwd_context.hash(
            otp
        )

        existing_user.otp_code = hashed_otp

        existing_user.otp_expires_at = (
            datetime.utcnow()
            + timedelta(minutes=5)
        )

        db.commit()

        try:

            send_otp_email(
                existing_user.email,
                otp
            )

        except Exception as e:

            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=f"Unable to send OTP: {str(e)}"
            )

        return {
            "status": "success",
            "message": "Verification code sent",
            "email": existing_user.email
        }

    # -------------------------------------------------
    # Create new user
    # -------------------------------------------------

    hashed_password = pwd_context.hash(
        user.password
    )

    otp = generate_otp()

    hashed_otp = pwd_context.hash(
        otp
    )

    new_user = User(

        fullname=user.fullname,

        email=user.email,

        password=hashed_password,

        is_verified=0,

        otp_code=hashed_otp,

        otp_expires_at=(
            datetime.utcnow()
            + timedelta(minutes=5)
        )
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    # -------------------------------------------------
    # Send OTP
    # -------------------------------------------------

    try:

        send_otp_email(
            new_user.email,
            otp
        )

    except Exception as e:

        db.delete(new_user)

        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send OTP: {str(e)}"
        )

    return {

        "status": "success",

        "message": "Verification code sent",

        "email": new_user.email
    }


# =====================================================
# VERIFY OTP
# =====================================================

@router.post("/verify-otp")
def verify_otp(
    email: str,
    otp: str,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_verified:

        return {
            "status": "success",
            "message": "Email already verified"
        }

    # -------------------------------------------------
    # OTP exists?
    # -------------------------------------------------

    if not user.otp_code:

        raise HTTPException(
            status_code=400,
            detail="No verification code found"
        )

    # -------------------------------------------------
    # OTP expired?
    # -------------------------------------------------

    if (
        not user.otp_expires_at
        or datetime.utcnow()
        > user.otp_expires_at
    ):

        raise HTTPException(
            status_code=400,
            detail="Verification code has expired"
        )

    # -------------------------------------------------
    # Check OTP
    # -------------------------------------------------

    if not pwd_context.verify(
        otp,
        user.otp_code
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )

    # -------------------------------------------------
    # Verify user
    # -------------------------------------------------

    user.is_verified = 1

    user.otp_code = None

    user.otp_expires_at = None

    db.commit()

    return {
        "status": "success",
        "message": "Email verified successfully"
    }


# =====================================================
# RESEND OTP
# =====================================================

@router.post("/resend-otp")
def resend_otp(
    email: str,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_verified:

        return {
            "status": "success",
            "message": "Email already verified"
        }

    # -------------------------------------------------
    # Generate new OTP
    # -------------------------------------------------

    otp = generate_otp()

    hashed_otp = pwd_context.hash(
        otp
    )

    user.otp_code = hashed_otp

    user.otp_expires_at = (
        datetime.utcnow()
        + timedelta(minutes=5)
    )

    db.commit()

    # -------------------------------------------------
    # Send email
    # -------------------------------------------------

    try:

        send_otp_email(
            user.email,
            otp
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send OTP: {str(e)}"
        )

    return {
        "status": "success",
        "message": "New verification code sent"
    }


# =====================================================
# LOGIN
# =====================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    db_user = (
        db.query(User)
        .filter(
            User.email == form_data.username
        )
        .first()
    )

    if not db_user:

        return {
            "status": "error",
            "message": "Invalid email or password"
        }

    # -------------------------------------------------
    # Password
    # -------------------------------------------------

    if not pwd_context.verify(
        form_data.password,
        db_user.password
    ):

        return {
            "status": "error",
            "message": "Invalid email or password"
        }

    # -------------------------------------------------
    # Email verification
    # -------------------------------------------------

    if not db_user.is_verified:

        return {
            "status": "error",
            "message": "Please verify your email first",
            "email_verified": False
        }

    # -------------------------------------------------
    # JWT
    # -------------------------------------------------

    token = create_access_token(
        {
            "sub": str(db_user.id),
            "email": db_user.email
        }
    )

    return {

        "access_token": token,

        "token_type": "bearer"
    }


# =====================================================
# CURRENT USER
# =====================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:

            return None

    except JWTError:

        return None

    user = (
        db.query(User)
        .filter(
            User.id == int(user_id)
        )
        .first()
    )

    return user


# =====================================================
# CURRENT USER
# =====================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "status": "success",
        "user": {
            "id": current_user.id,
            "fullname": current_user.fullname,
            "email": current_user.email,
            "is_verified": current_user.is_verified,
            "chat_history_enabled": bool(
                current_user.chat_history_enabled
            ),
            "created_at": current_user.created_at,
        }
    }


# =====================================================
# CHANGE PASSWORD
# =====================================================

@router.put("/change-password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(
            status_code=400,
            detail="Current password and new password are required"
        )

    # Check old password
    if not pwd_context.verify(
        current_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    if len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters"
        )

    if current_password == new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )

    current_user.password = pwd_context.hash(
        new_password
    )

    db.commit()

    return {
        "status": "success",
        "message": "Password changed successfully"
    }


# =====================================================
# CHAT HISTORY SETTING
# =====================================================

@router.put("/chat-history")
def update_chat_history(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enabled = data.get("enabled")

    if enabled is None:
        raise HTTPException(
            status_code=400,
            detail="enabled is required"
        )

    current_user.chat_history_enabled = (
        1 if enabled else 0
    )

    db.commit()

    return {
        "status": "success",
        "chat_history_enabled": bool(
            current_user.chat_history_enabled
        )
    }