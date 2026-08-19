from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

import os
import uuid

from database import get_db
from auth import get_current_user
from models import UploadedFile, User

from supabase import create_client


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


# =====================================================
# SUPABASE CONFIG
# =====================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

BUCKET_NAME = "nova-files"


# =====================================================
# SUPABASE CLIENT
# =====================================================

supabase = None

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_KEY
        )

        print("Supabase client initialized successfully.")

    except Exception as e:
        print("Supabase initialization error:", str(e))
        supabase = None

else:
    print(
        "WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY "
        "is missing."
    )


# =====================================================
# UPLOAD FILE
# =====================================================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -------------------------------------------------
    # Check Supabase
    # -------------------------------------------------

    if supabase is None:
        raise HTTPException(
            status_code=500,
            detail="File storage service is not configured."
        )


    # -------------------------------------------------
    # Validate file
    # -------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )


    # -------------------------------------------------
    # Validate PDF
    # -------------------------------------------------

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

        print("=" * 80)
        print("FILE READ ERROR:", str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail="Unable to read uploaded file."
        )


    # -------------------------------------------------
    # Empty file check
    # -------------------------------------------------

    if not file_content:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )


    # -------------------------------------------------
    # File size
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

    if extension != ".pdf":
        extension = ".pdf"


    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )


    # -------------------------------------------------
    # User-specific storage path
    # -------------------------------------------------

    storage_path = (
        f"user_{current_user.id}/"
        f"{unique_filename}"
    )


    # -------------------------------------------------
    # Upload to Supabase Storage
    # -------------------------------------------------

    try:

        result = (
            supabase
            .storage
            .from_(BUCKET_NAME)
            .upload(
                storage_path,
                file_content,
                {
                    "content-type": "application/pdf",
                    "upsert": "false",
                }
            )
        )

        print("=" * 80)
        print("SUPABASE UPLOAD SUCCESS")
        print("Storage path:", storage_path)
        print("Result:", result)
        print("=" * 80)

    except Exception as e:

        print("=" * 80)
        print("SUPABASE UPLOAD ERROR")
        print("Error:", str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload PDF: {str(e)}"
        )


    # -------------------------------------------------
    # Save database record
    # -------------------------------------------------

    try:

        uploaded = UploadedFile(
            user_id=current_user.id,
            filename=file.filename,
            filepath=storage_path,
            filetype="application/pdf",
        )

        db.add(uploaded)

        db.commit()

        db.refresh(uploaded)

    except Exception as e:

        print("=" * 80)
        print("DATABASE SAVE ERROR")
        print("Error:", str(e))
        print("=" * 80)


        # ---------------------------------------------
        # Rollback database
        # ---------------------------------------------

        db.rollback()


        # ---------------------------------------------
        # Remove uploaded file from Supabase
        # ---------------------------------------------

        try:

            (
                supabase
                .storage
                .from_(BUCKET_NAME)
                .remove([
                    storage_path
                ])
            )

        except Exception as cleanup_error:

            print(
                "Storage cleanup error:",
                str(cleanup_error)
            )


        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file information."
        )


    # -------------------------------------------------
    # Success
    # -------------------------------------------------

    return {
        "status": "success",
        "file_id": uploaded.id,
        "filename": uploaded.filename,
        "filetype": uploaded.filetype,
        "storage_path": storage_path,
    }


# =====================================================
# STORAGE STATUS
# =====================================================

@router.get("/storage-status")
def storage_status():

    if supabase is None:

        return {
            "status": "error",
            "storage": "not_configured"
        }


    return {
        "status": "success",
        "storage": "supabase",
        "bucket": BUCKET_NAME
    }