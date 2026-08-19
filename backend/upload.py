from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import os
import uuid
import shutil
import tempfile

from database import get_db
from auth import get_current_user
from models import UploadedFile, User

from pdf_utils import extract_pdf_text

from schemas import (
    AskPdf,
    AskImage,
    TTSRequest,
)

from ai import (
    ask_pdf,
    ask_image,
    speech_to_text,
    text_to_speech,
)

from supabase import create_client, Client


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


# =====================================================
# SUPABASE CONFIGURATION
# =====================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing"
    )


if not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_KEY is missing"
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
# Upload PDF
# =====================================================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -------------------------------------------------
    # Validate filename
    # -------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )


    # -------------------------------------------------
    # Validate file type
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

        print(
            "FILE READ ERROR:",
            str(e)
        )

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
    # File size check
    # -------------------------------------------------

    max_size = 20 * 1024 * 1024

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


    # =================================================
    # Upload to Supabase Storage
    # =================================================

    try:

        print("=" * 80)
        print("SUPABASE PDF UPLOAD")
        print("Original filename:", file.filename)
        print("Storage path:", storage_path)
        print("=" * 80)


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


        print("SUPABASE UPLOAD SUCCESS")


    except Exception as e:

        print("=" * 80)
        print("SUPABASE UPLOAD ERROR:")
        print(str(e))
        print("=" * 80)


        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload PDF: {str(e)}"
        )


    # =================================================
    # Save database record
    # =================================================

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


        print(
            "DATABASE RECORD CREATED:",
            uploaded.id
        )


    except Exception as e:

        print("=" * 80)
        print("DATABASE UPLOAD ERROR:")
        print(str(e))
        print("=" * 80)


        # ---------------------------------------------
        # Rollback Supabase upload
        # ---------------------------------------------

        try:

            supabase.storage \
                .from_(BUCKET_NAME) \
                .remove([
                    storage_path
                ])

        except Exception as cleanup_error:

            print(
                "SUPABASE CLEANUP ERROR:",
                str(cleanup_error)
            )


        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file information."
        )


    # =================================================
    # Response
    # =================================================

    return {

        "status": "success",

        "file_id": uploaded.id,

        "filename": uploaded.filename,

        "filetype": uploaded.filetype,

        "storage_path": storage_path,

    }


# =====================================================
# Chat With PDF
# =====================================================

@router.post("/chat-pdf")
def chat_with_pdf(
    data: AskPdf,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # -------------------------------------------------
    # Find uploaded file
    # -------------------------------------------------

    uploaded = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == data.file_id,
            UploadedFile.user_id == current_user.id
        )
        .first()
    )


    if not uploaded:

        raise HTTPException(
            status_code=404,
            detail="File not found."
        )


    # -------------------------------------------------
    # Check PDF
    # -------------------------------------------------

    if uploaded.filetype != "application/pdf":

        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )


    temp_path = None


    try:

        # =================================================
        # Download PDF from Supabase
        # =================================================

        print("=" * 80)
        print("DOWNLOADING PDF FROM SUPABASE")
        print("Storage path:", uploaded.filepath)
        print("=" * 80)


        pdf_bytes = (
            supabase.storage
            .from_(BUCKET_NAME)
            .download(uploaded.filepath)
        )


        if not pdf_bytes:

            raise Exception(
                "PDF download returned empty data."
            )


        print(
            "PDF DOWNLOADED:",
            len(pdf_bytes),
            "bytes"
        )


        # =================================================
        # Create temporary PDF
        # =================================================

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(pdf_bytes)

            temp_path = temp_file.name


        print(
            "TEMP PDF:",
            temp_path
        )


        # =================================================
        # Extract PDF text
        # =================================================

        pdf_text = extract_pdf_text(
            temp_path
        )


        print(
            "PDF TEXT LENGTH:",
            len(pdf_text)
        )


        if not pdf_text or not pdf_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found inside PDF."
            )


        # =================================================
        # Ask AI
        # =================================================

        print(
            "PDF QUESTION:",
            data.question
        )


        answer = ask_pdf(
            pdf_text,
            data.question
        )


        print(
            "PDF ANSWER:",
            answer
        )


        # =================================================
        # Response
        # =================================================

        return {

            "status": "success",

            "filename": uploaded.filename,

            "answer": answer

        }


    except HTTPException:

        raise


    except Exception as e:

        print("=" * 80)
        print("PDF CHAT ERROR:")
        print(str(e))
        print("=" * 80)


        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(e)}"
        )


    finally:

        # =================================================
        # Remove temporary file
        # =================================================

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except Exception as e:

                print(
                    "TEMP FILE CLEANUP ERROR:",
                    str(e)
                )


# =====================================================
# Image Understanding
# =====================================================

@router.post("/ask-image")
def ask_uploaded_image(
    data: AskImage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # -------------------------------------------------
    # Find file
    # -------------------------------------------------

    uploaded = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == data.file_id,
            UploadedFile.user_id == current_user.id
        )
        .first()
    )


    if not uploaded:

        raise HTTPException(
            status_code=404,
            detail="File not found."
        )


    # -------------------------------------------------
    # Check image
    # -------------------------------------------------

    if not uploaded.filetype.startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload an image."
        )


    try:

        answer = ask_image(
            uploaded.filepath,
            data.question
        )


        return {

            "status": "success",

            "filename": uploaded.filename,

            "answer": answer

        }


    except Exception as e:

        print(
            "IMAGE CHAT ERROR:",
            str(e)
        )


        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# Speech To Text
# =====================================================

@router.post("/speech")
def speech_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):

    suffix = (
        os.path.splitext(
            file.filename or ""
        )[1]
        or ".webm"
    )


    temp_path = None


    try:

        # -------------------------------------------------
        # Temporary audio file
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            shutil.copyfileobj(
                file.file,
                temp_file
            )

            temp_path = temp_file.name


        print(
            "Speech temp file:",
            temp_path
        )


        # -------------------------------------------------
        # Speech recognition
        # -------------------------------------------------

        text = speech_to_text(
            temp_path
        )


        print(
            "Recognized Text:",
            text
        )


        return {

            "status": "success",

            "filename": file.filename,

            "text": text

        }


    except Exception as e:

        print(
            "Speech Error:",
            str(e)
        )


        raise HTTPException(
            status_code=500,
            detail=f"Speech recognition failed: {str(e)}"
        )


    finally:

        # -------------------------------------------------
        # Cleanup
        # -------------------------------------------------

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except Exception:
                pass


# =====================================================
# Text To Speech
# =====================================================

@router.post("/tts")
def tts(
    data: TTSRequest
):

    try:

        audio_path = text_to_speech(
            data.text
        )


        return FileResponse(
            path=audio_path,
            media_type="audio/mpeg",
            filename="nova_ai.mp3"
        )


    except Exception as e:

        print(
            "TTS ERROR:",
            str(e)
        )


        raise HTTPException(
            status_code=500,
            detail=f"Text to speech failed: {str(e)}"
        )


# =====================================================
# Supported File Types
# =====================================================

@router.get("/supported-types")
def supported_types():

    return {

        "status": "success",

        "images": [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ],

        "documents": [
            "pdf"
        ],

        "audio": [
            "mp3",
            "wav",
            "ogg",
            "webm",
            "m4a"
        ]

    }


# =====================================================
# Storage Status
# =====================================================

@router.get("/storage-status")
def storage_status():

    return {

        "status": "success",

        "storage": "supabase",

        "bucket": BUCKET_NAME

    }


# =====================================================
# Health Check
# =====================================================

@router.get("/status")
def file_status():

    return {

        "status": "success",

        "message": "Upload API Working",

        "services": {

            "pdf_chat": True,

            "image_chat": True,

            "speech_to_text": True,

            "text_to_speech": True

        }

    }