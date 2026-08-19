
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException,
)

from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

import os
import uuid
import shutil
import tempfile
from io import BytesIO

from dotenv import load_dotenv
from supabase import create_client, Client

from database import get_db
from auth import get_current_user
from models import UploadedFile, User

from pdf_utils import extract_pdf_text

from schemas import (
    AskPdf,
    AskImage,
    TTSRequest,
    GenerateImageRequest,
)

from ai import (
    ask_pdf,
    ask_image,
    speech_to_text,
    text_to_speech,
    generate_image,
)


# =====================================================
# ENVIRONMENT
# =====================================================

load_dotenv()


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/files",
    tags=["Files"],
)


# =====================================================
# SUPABASE
# =====================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY"
)


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
    SUPABASE_SERVICE_KEY,
)


# =====================================================
# STORAGE
# =====================================================

BUCKET_NAME = "nova-files"

MAX_FILE_SIZE = 20 * 1024 * 1024


# =====================================================
# ALLOWED FILE TYPES
# =====================================================

ALLOWED_TYPES = {

    "application/pdf": "pdf",

    "image/jpeg": "image",

    "image/png": "image",

    "image/webp": "image",

}


# =====================================================
# UPLOAD FILE
# =====================================================

@router.post("/upload")
async def upload_file(

    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),

):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )


    if file.content_type not in ALLOWED_TYPES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: PDF, JPG, JPEG, PNG, WEBP."
            ),
        )


    # =================================================
    # READ FILE
    # =================================================

    try:

        file_content = await file.read()

    except Exception as e:

        print("=" * 80)
        print("FILE READ ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail="Unable to read uploaded file.",
        )


    if not file_content:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )


    if len(file_content) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=400,
            detail="File must be smaller than 20MB.",
        )


    # =================================================
    # FILE EXTENSION
    # =================================================

    extension = os.path.splitext(
        file.filename
    )[1].lower()


    if not extension:

        if file.content_type == "application/pdf":

            extension = ".pdf"

        elif file.content_type == "image/jpeg":

            extension = ".jpg"

        elif file.content_type == "image/png":

            extension = ".png"

        elif file.content_type == "image/webp":

            extension = ".webp"


    # =================================================
    # UNIQUE FILE NAME
    # =================================================

    unique_filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


    storage_path = (
        f"user_{current_user.id}/"
        f"{unique_filename}"
    )


    # =================================================
    # SUPABASE UPLOAD
    # =================================================

    try:

        supabase.storage \
            .from_(BUCKET_NAME) \
            .upload(
                storage_path,
                file_content,
                {
                    "content-type": file.content_type,
                    "upsert": "false",
                },
            )

    except Exception as e:

        print("=" * 80)
        print("SUPABASE UPLOAD ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to upload file to storage: {str(e)}"
            ),
        )


    # =================================================
    # SAVE FILE INFORMATION
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

    except Exception as e:

        print("=" * 80)
        print("DATABASE FILE ERROR:")
        print(str(e))
        print("=" * 80)


        # Roll back Supabase upload if DB fails

        try:

            supabase.storage \
                .from_(BUCKET_NAME) \
                .remove([
                    storage_path
                ])

        except Exception as cleanup_error:

            print(
                "SUPABASE CLEANUP ERROR:",
                str(cleanup_error),
            )


        raise HTTPException(
            status_code=500,
            detail="Failed to save file information.",
        )


    # =================================================
    # RESPONSE
    # =================================================

    return {

        "status": "success",

        "file_id": uploaded.id,

        "filename": uploaded.filename,

        "filetype": uploaded.filetype,

        "storage_path": storage_path,

        "file_category": ALLOWED_TYPES[
            file.content_type
        ],

    }


# =====================================================
# CHAT WITH PDF
# =====================================================

@router.post("/chat-pdf")
def chat_with_pdf(

    data: AskPdf,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),

):

    uploaded = (

        db.query(UploadedFile)

        .filter(

            UploadedFile.id == data.file_id,

            UploadedFile.user_id ==
            current_user.id,

        )

        .first()

    )


    if not uploaded:

        raise HTTPException(
            status_code=404,
            detail="File not found.",
        )


    if uploaded.filetype != "application/pdf":

        raise HTTPException(
            status_code=400,
            detail="This file is not a PDF.",
        )


    temp_path = None


    try:

        # =============================================
        # DOWNLOAD PDF
        # =============================================

        pdf_bytes = (

            supabase.storage

            .from_(BUCKET_NAME)

            .download(
                uploaded.filepath
            )

        )


        # =============================================
        # TEMPORARY PDF
        # =============================================

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf",
        )

        temp_path = temp_file.name

        temp_file.write(pdf_bytes)

        temp_file.close()


        # =============================================
        # EXTRACT TEXT
        # =============================================

        pdf_text = extract_pdf_text(
            temp_path
        )


        print("=" * 80)
        print("PDF:", uploaded.filename)
        print("PDF LENGTH:", len(pdf_text))
        print("=" * 80)


        if not pdf_text.strip():

            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text found "
                    "inside this PDF."
                ),
            )


        # =============================================
        # ASK AI
        # =============================================

        answer = ask_pdf(
            pdf_text,
            data.question,
        )


        return {

            "status": "success",

            "filename": uploaded.filename,

            "answer": answer,

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
            detail=(
                f"PDF processing failed: {str(e)}"
            ),
        )


    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except Exception:

                pass


# =====================================================
# CHAT WITH IMAGE
# =====================================================

@router.post("/ask-image")
def ask_uploaded_image(

    data: AskImage,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),

):

    uploaded = (

        db.query(UploadedFile)

        .filter(

            UploadedFile.id == data.file_id,

            UploadedFile.user_id ==
            current_user.id,

        )

        .first()

    )


    if not uploaded:

        raise HTTPException(
            status_code=404,
            detail="Image not found.",
        )


    if not uploaded.filetype.startswith(
        "image/"
    ):

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not an image.",
        )


    temp_path = None


    try:

        # =============================================
        # DOWNLOAD IMAGE
        # =============================================

        image_bytes = (

            supabase.storage

            .from_(BUCKET_NAME)

            .download(
                uploaded.filepath
            )

        )


        # =============================================
        # FILE EXTENSION
        # =============================================

        extension = os.path.splitext(
            uploaded.filename
        )[1] or ".jpg"


        # =============================================
        # TEMP IMAGE
        # =============================================

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        )

        temp_path = temp_file.name

        temp_file.write(image_bytes)

        temp_file.close()


        # =============================================
        # ASK AI
        # =============================================

        answer = ask_image(
            temp_path,
            data.question,
        )


        return {

            "status": "success",

            "filename": uploaded.filename,

            "answer": answer,

        }


    except HTTPException:

        raise


    except Exception as e:

        print("=" * 80)
        print("IMAGE CHAT ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(
            status_code=500,
            detail=(
                f"Image processing failed: {str(e)}"
            ),
        )


    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except Exception:

                pass


# =====================================================
# AI IMAGE GENERATION
# HUGGING FACE
# =====================================================

@router.post("/generate-image")
def generate_ai_image(

    data: GenerateImageRequest,

    current_user: User = Depends(
        get_current_user
    ),

):

    # =================================================
    # VALIDATE PROMPT
    # =================================================

    if not data.prompt:

        raise HTTPException(
            status_code=400,
            detail="Image prompt is required.",
        )


    prompt = data.prompt.strip()


    if not prompt:

        raise HTTPException(
            status_code=400,
            detail="Image prompt is required.",
        )


    # =================================================
    # LOG REQUEST
    # =================================================

    print("=" * 80)
    print("NOVA AI IMAGE GENERATION")
    print("PROVIDER: HUGGING FACE")
    print("USER:", current_user.id)
    print("PROMPT:", prompt)
    print("=" * 80)


    try:

        # =============================================
        # GENERATE IMAGE
        # =============================================

        image = generate_image(
            prompt
        )


        if image is None:

            raise RuntimeError(
                "Hugging Face returned no image."
            )


        # =============================================
        # CONVERT IMAGE TO PNG IN MEMORY
        #
        # IMPORTANT:
        # Do not use a temporary file here.
        # This is more reliable on Vercel.
        # =============================================

        image_buffer = BytesIO()


        image.save(
            image_buffer,
            format="PNG",
        )


        image_buffer.seek(0)


        print(
            "Hugging Face image generated successfully."
        )


        # =============================================
        # RETURN IMAGE
        # =============================================

        return StreamingResponse(

            image_buffer,

            media_type="image/png",

            headers={
                "Content-Disposition":
                    'inline; filename="nova-generated.png"'
            },

        )


    except Exception as e:

        print("=" * 80)
        print("HUGGING FACE IMAGE GENERATION ERROR:")
        print(type(e).__name__)
        print(str(e))
        print("=" * 80)


        raise HTTPException(

            status_code=500,

            detail=(
                "Image generation failed: "
                f"{str(e)}"
            ),

        )


# =====================================================
# SPEECH TO TEXT
# =====================================================

@router.post("/speech")
def speech_upload(

    file: UploadFile = File(...),

    current_user: User = Depends(
        get_current_user
    ),

):

    temp_path = None


    suffix = (

        os.path.splitext(
            file.filename or ""
        )[1]

        or ".webm"

    )


    try:

        # =============================================
        # SAVE AUDIO TEMPORARILY
        # =============================================

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:

            shutil.copyfileobj(
                file.file,
                temp_file,
            )

            temp_path = temp_file.name


        print(
            "Speech temp file:",
            temp_path,
        )


        # =============================================
        # TRANSCRIBE
        # =============================================

        text = speech_to_text(
            temp_path
        )


        print(
            "Recognized Text:",
            text,
        )


        return {

            "status": "success",

            "filename": file.filename,

            "text": text,

        }


    except Exception as e:

        print("=" * 80)
        print("SPEECH ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(

            status_code=500,

            detail=(
                f"Speech recognition failed: {str(e)}"
            ),

        )


    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except Exception:

                pass


# =====================================================
# TEXT TO SPEECH
# =====================================================

@router.post("/tts")
def tts(

    data: TTSRequest,

):

    audio_path = None


    try:

        if not data.text or not data.text.strip():

            raise HTTPException(
                status_code=400,
                detail="Text is required.",
            )


        # =============================================
        # GENERATE AUDIO
        # =============================================

        audio_path = text_to_speech(
            data.text
        )


        return FileResponse(

            path=audio_path,

            media_type="audio/mpeg",

            filename="nova_ai.mp3",

        )


    except HTTPException:

        raise


    except Exception as e:

        print("=" * 80)
        print("TTS ERROR:")
        print(str(e))
        print("=" * 80)

        raise HTTPException(

            status_code=500,

            detail=(
                f"Text to speech failed: {str(e)}"
            ),

        )


# =====================================================
# SUPPORTED FILE TYPES
# =====================================================

@router.get("/supported-types")
def supported_types():

    return {

        "status": "success",

        "images": [
            "jpg",
            "jpeg",
            "png",
            "webp",
        ],

        "documents": [
            "pdf",
        ],

        "audio": [
            "mp3",
            "wav",
            "ogg",
            "webm",
            "m4a",
        ],

    }


# =====================================================
# FILE SERVICE HEALTH CHECK
# =====================================================

@router.get("/status")
def file_status():

    return {

        "status": "success",

        "storage": "supabase",

        "bucket": BUCKET_NAME,

        "image_generation": {

            "provider": "huggingface",

            "model":
                "black-forest-labs/FLUX.1-schnell",

        },

        "services": {

            "pdf_chat": True,

            "image_chat": True,

            "image_generation": True,

            "speech_to_text": True,

            "text_to_speech": True,

        },

    }
