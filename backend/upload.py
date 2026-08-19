from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

import os
import uuid

from database import get_db
from auth import get_current_user
from models import UploadedFile, User


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


# =====================================================
# SUPABASE
# =====================================================

from supabase import create_client, Client


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SERVICE_KEY is missing"
    )


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)


# =====================================================
# STORAGE BUCKET
# =====================================================

BUCKET_NAME = "nova-files"


# =====================================================
# Upload File
# =====================================================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -------------------------------------------------
    # Validate file
    # -------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    # -------------------------------------------------
    # Read file
    # -------------------------------------------------

    try:

        file_content = await file.read()

    except Exception as e:

        print("FILE READ ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to read uploaded file."
        )


    if not file_content:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )


    # -------------------------------------------------
    # File size check
    # -------------------------------------------------

    max_size = 20 * 1024 * 1024  # 20 MB

    if len(file_content) > max_size:

        raise HTTPException(
            status_code=400,
            detail="PDF must be smaller than 20MB."
        )


    # -------------------------------------------------
    # Generate unique filename
    # -------------------------------------------------

    extension = os.path.splitext(
        file.filename
    )[1].lower()

    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )


    # Store files separately for each user
    storage_path = (
        f"user_{current_user.id}/"
        f"{unique_filename}"
    )


    # -------------------------------------------------
    # Upload to Supabase Storage
    # -------------------------------------------------

    try:

        supabase.storage \
            .from_(BUCKET_NAME) \
            .upload(
                storage_path,
                file_content,
                {
                    "content-type": "application/pdf",
                    "upsert": "false",
                }
            )

    except Exception as e:

        print("=" * 80)
        print("SUPABASE UPLOAD ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail="Failed to upload PDF to storage."
        )


    # -------------------------------------------------
    # Save database record
    # -------------------------------------------------

    try:

        uploaded = UploadedFile(
            user_id=current_user.id,
            filename=file.filename,
            filepath=storage_path,
            filetype=file.content_type,
        )

        db.add(uploaded)
        db.commit()
        db.refresh(uploaded)

    except Exception as e:

        print("=" * 80)
        print("DATABASE UPLOAD ERROR:")
        print(str(e))
        print("=" * 80)

        # Try removing uploaded file
        try:

            supabase.storage \
                .from_(BUCKET_NAME) \
                .remove([
                    storage_path
                ])

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file information."
        )


    # -------------------------------------------------
    # Response
    # -------------------------------------------------

    return {
        "status": "success",
        "file_id": uploaded.id,
        "filename": uploaded.filename,
        "filetype": uploaded.filetype,
        "storage_path": storage_path,
    }