import os
import base64

from dotenv import load_dotenv

from groq import Groq
from google import genai

from PIL import Image

from gtts import gTTS

from huggingface_hub import InferenceClient


# =====================================================
# ENVIRONMENT
# =====================================================

load_dotenv()


# =====================================================
# API KEYS
# =====================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

HF_TOKEN = os.getenv("HF_TOKEN")


# =====================================================
# VALIDATE API KEYS
# =====================================================

if not GROQ_API_KEY:

    raise RuntimeError(
        "GROQ_API_KEY is missing"
    )


if not GEMINI_API_KEY:

    raise RuntimeError(
        "GEMINI_API_KEY is missing"
    )


if not HF_TOKEN:

    raise RuntimeError(
        "HF_TOKEN is missing"
    )


# =====================================================
# CLIENTS
# =====================================================

groq_client = Groq(
    api_key=GROQ_API_KEY
)


gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =====================================================
# HUGGING FACE CLIENT
# =====================================================

hf_client = InferenceClient(
    token=HF_TOKEN
)


# =====================================================
# MODELS
# =====================================================

GROQ_MODEL = "openai/gpt-oss-20b"

GEMINI_VISION_MODEL = "gemini-2.5-flash"

HF_IMAGE_MODEL = (
    "black-forest-labs/FLUX.1-schnell"
)


# =====================================================
# NORMAL CHAT
# =====================================================

def ask_ai(messages):

    response = (
        groq_client
        .chat
        .completions
        .create(

            model=GROQ_MODEL,

            messages=messages,

            temperature=0.7,

            max_tokens=1024,

        )
    )


    return (
        response
        .choices[0]
        .message
        .content
    )


# =====================================================
# GENERATE CHAT TITLE
# =====================================================

def generate_title(message: str):

    response = (
        groq_client
        .chat
        .completions
        .create(

            model=GROQ_MODEL,

            messages=[

                {
                    "role": "system",

                    "content": (
                        "Generate a short chat title. "
                        "Maximum 6 words. "
                        "Return only the title."
                    ),
                },

                {
                    "role": "user",

                    "content": message,
                },

            ],

            temperature=0.5,

            max_tokens=30,

        )
    )


    return (
        response
        .choices[0]
        .message
        .content
        .strip()
    )


# =====================================================
# PDF CHAT
# =====================================================

def ask_pdf(
    pdf_text: str,
    question: str,
):

    if not pdf_text or not pdf_text.strip():

        raise ValueError(
            "PDF text is empty."
        )


    if not question or not question.strip():

        raise ValueError(
            "Question is required."
        )


    # Prevent extremely large prompts
    # from becoming unnecessarily expensive.

    max_pdf_chars = 50000

    if len(pdf_text) > max_pdf_chars:

        pdf_text = pdf_text[
            :max_pdf_chars
        ]


    messages = [

        {
            "role": "system",

            "content": (
                "You are Nova AI, an intelligent "
                "PDF assistant. "
                "Answer the user's question using "
                "the provided PDF content. "
                "If the answer is not present in "
                "the PDF, clearly say that it is "
                "not available in the document. "
                "Do not invent information."
            ),
        },

        {
            "role": "user",

            "content": (
                "PDF CONTENT:\n\n"
                f"{pdf_text}\n\n"
                "USER QUESTION:\n\n"
                f"{question}"
            ),
        },

    ]


    return ask_ai(messages)


# =====================================================
# IMAGE UNDERSTANDING
# =====================================================

def understand_image(
    image: Image.Image,
    prompt: str,
):

    try:

        response = (
            gemini_client
            .models
            .generate_content(

                model=GEMINI_VISION_MODEL,

                contents=[
                    prompt,
                    image,
                ],

            )
        )


        return (
            response.text
            or "I couldn't understand this image."
        )


    except Exception as e:

        print("=" * 80)

        print(
            "IMAGE UNDERSTANDING ERROR:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )

        print("=" * 80)

        raise


# =====================================================
# IMAGE FILE UNDERSTANDING
# =====================================================

def ask_image(
    image_path: str,
    question: str,
):

    if not image_path:

        raise ValueError(
            "Image path is required."
        )


    if not os.path.exists(image_path):

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )


    if not question or not question.strip():

        question = (
            "Describe this image in detail."
        )


    try:

        image = Image.open(
            image_path
        )


        # Make sure the image is loaded
        image.load()


        answer = understand_image(
            image,
            question.strip(),
        )


        return answer


    except Exception as e:

        print("=" * 80)

        print(
            "IMAGE FILE PROCESSING ERROR:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )

        print("=" * 80)

        raise


# =====================================================
# AI IMAGE GENERATION
# HUGGING FACE
# =====================================================

def generate_image(
    prompt: str
):

    if not prompt or not prompt.strip():

        raise ValueError(
            "Image prompt cannot be empty."
        )


    prompt = prompt.strip()


    try:

        print("=" * 80)

        print(
            "NOVA AI - HUGGING FACE IMAGE GENERATION"
        )

        print(
            "MODEL:",
            HF_IMAGE_MODEL,
        )

        print(
            "PROMPT:",
            prompt,
        )

        print("=" * 80)


        # =============================================
        # HUGGING FACE IMAGE GENERATION
        # =============================================

        image = (
            hf_client
            .text_to_image(

                prompt=prompt,

                model=HF_IMAGE_MODEL,

            )
        )


        if image is None:

            raise RuntimeError(
                "Hugging Face returned no image."
            )


        print(
            "Hugging Face image generated successfully."
        )


        return image


    except Exception as e:

        print("=" * 80)

        print(
            "HUGGING FACE IMAGE GENERATION ERROR:"
        )

        print(
            "TYPE:",
            type(e).__name__,
        )

        print(
            "ERROR:",
            str(e),
        )

        print("=" * 80)

        raise


# =====================================================
# STREAMING CHAT
# =====================================================

def ask_ai_stream(messages):

    return (
        groq_client
        .chat
        .completions
        .create(

            model=GROQ_MODEL,

            messages=messages,

            temperature=0.7,

            max_tokens=1024,

            stream=True,

        )
    )


# =====================================================
# TEXT TO SPEECH
# =====================================================

def text_to_speech(
    text: str
):

    if not text or not text.strip():

        raise ValueError(
            "Text is required for TTS."
        )


    os.makedirs(
        "uploads",
        exist_ok=True,
    )


    filename = (
        "uploads/output.mp3"
    )


    tts = gTTS(

        text=text.strip(),

        lang="en",

        slow=False,

    )


    tts.save(
        filename
    )


    return filename


# =====================================================
# SPEECH TO TEXT
# =====================================================

def speech_to_text(
    audio_path: str
):

    if not audio_path:

        raise ValueError(
            "Audio path is required."
        )


    if not os.path.exists(audio_path):

        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )


    with open(
        audio_path,
        "rb",
    ) as audio_file:

        transcription = (

            groq_client

            .audio

            .transcriptions

            .create(

                file=audio_file,

                model=(
                    "whisper-large-v3-turbo"
                ),

                response_format="text",

            )

        )


    return transcription


# =====================================================
# AI STATUS
# =====================================================

def ai_status():

    return {

        "groq": bool(
            GROQ_API_KEY
        ),

        "gemini": bool(
            GEMINI_API_KEY
        ),

        "huggingface": bool(
            HF_TOKEN
        ),

        "image_model":
            HF_IMAGE_MODEL,

    }
