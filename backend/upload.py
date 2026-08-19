from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import shutil
import os

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

router = APIRouter(
    prefix="/files",
    tags=["Files"]
)

# =====================================================
# Upload File
# =====================================================

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    os.makedirs("uploads", exist_ok=True)

    filepath = os.path.join(
        "uploads",
        file.filename
    )

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    uploaded = UploadedFile(
        user_id=current_user.id,
        filename=file.filename,
        filepath=filepath,
        filetype=file.content_type,
    )

    db.add(uploaded)
    db.commit()
    db.refresh(uploaded)

    return {
        "status": "success",
        "file_id": uploaded.id,
        "filename": uploaded.filename,
        "filetype": uploaded.filetype,
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
    uploaded = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == data.file_id,
            UploadedFile.user_id == current_user.id
        )
        .first()
    )

    if not uploaded:
        return {
            "status": "error",
            "message": "File not found"
        }

    # Check PDF
    if uploaded.filetype != "application/pdf":
        return {
            "status": "error",
            "message": "Please upload a PDF file."
        }

    # Check file exists
    if not os.path.exists(uploaded.filepath):
        return {
            "status": "error",
            "message": "PDF file does not exist on server."
        }

    try:

        # Extract PDF text
        pdf_text = extract_pdf_text(
            uploaded.filepath
        )

        print("=" * 80)
        print("PDF FILE:", uploaded.filename)
        print("PDF LENGTH:", len(pdf_text))
        print("=" * 80)

        if not pdf_text.strip():
            return {
                "status": "error",
                "message": "No text found inside PDF."
            }

        # Ask AI
        answer = ask_pdf(
            pdf_text,
            data.question
        )

        print("QUESTION:", data.question)
        print("ANSWER:", answer)
        print("=" * 80)

        return {
            "status": "success",
            "filename": uploaded.filename,
            "answer": answer
        }

    except Exception as e:

        print("PDF CHAT ERROR:", str(e))

        return {
            "status": "error",
            "message": str(e)
        }



# =====================================================
# Image Understanding
# =====================================================

@router.post("/ask-image")
def ask_uploaded_image(
    data: AskImage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    uploaded = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == data.file_id,
            UploadedFile.user_id == current_user.id
        )
        .first()
    )

    if not uploaded:
        return {
            "status": "error",
            "message": "File not found."
        }

    if not uploaded.filetype.startswith("image/"):
        return {
            "status": "error",
            "message": "Please upload an image."
        }

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

        return {
            "status": "error",
            "message": str(e)
        }

   # =====================================================
# Speech To Text
# =====================================================

@router.post("/speech")
def speech_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    import tempfile

    suffix = os.path.splitext(file.filename or "")[1] or ".webm"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            shutil.copyfileobj(
                file.file,
                temp_file
            )

            temp_path = temp_file.name

        print("Speech temp file:", temp_path)

        text = speech_to_text(temp_path)

        print("Recognized Text:", text)

        return {
            "status": "success",
            "filename": file.filename,
            "text": text
        }

    except Exception as e:

        print("Speech Error:", str(e))

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if temp_path and os.path.exists(temp_path):

            try:
                os.remove(temp_path)
            except Exception:
                pass


# =====================================================
# Text To Speech
# =====================================================

@router.post("/tts")
def tts(data: TTSRequest):

    audio_path = text_to_speech(data.text)

    return FileResponse(
        path=audio_path,
        media_type="audio/mpeg",
        filename="nova_ai.mp3"
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