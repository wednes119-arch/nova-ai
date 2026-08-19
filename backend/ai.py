import os

from dotenv import load_dotenv
from groq import Groq
from google import genai
from google.genai import types
from PIL import Image
from gtts import gTTS

load_dotenv()


# =====================================================
# CLIENTS
# =====================================================

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# =====================================================
# MODELS
# =====================================================

GROQ_MODEL = "openai/gpt-oss-20b"

GEMINI_VISION_MODEL = "gemini-2.5-flash"

GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"


# =====================================================
# NORMAL CHAT
# =====================================================

def ask_ai(messages):

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024
    )

    return response.choices[0].message.content


# =====================================================
# GENERATE CHAT TITLE
# =====================================================

def generate_title(message: str):

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Generate a short chat title in 3 to 5 words. "
                    "Return only the title. Do not use quotes."
                )
            },
            {
                "role": "user",
                "content": message
            }
        ],
        temperature=0.2,
        max_tokens=20
    )

    return response.choices[0].message.content.strip()


# =====================================================
# CHAT WITH PDF
# =====================================================

def ask_pdf(pdf_text: str, question: str):

    # Prevent extremely large context
    pdf_text = pdf_text[:12000]

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": """
You are Nova AI.

Answer ONLY from the uploaded PDF.

If the information exists anywhere in the document,
find it carefully before replying.

Do not guess.

If the answer is not present, reply exactly:

I couldn't find that information in the document.
"""
            },
            {
                "role": "user",
                "content": f"""
PDF CONTENT:

{pdf_text}

QUESTION:

{question}

Answer only from the PDF.
"""
            }
        ],
        temperature=0,
        max_tokens=700,
    )

    return response.choices[0].message.content.strip()


# =====================================================
# IMAGE UNDERSTANDING
# =====================================================

def ask_image(image_path: str, question: str):

    try:

        image = Image.open(image_path)

        response = gemini_client.models.generate_content(
            model=GEMINI_VISION_MODEL,
            contents=[
                image,
                question
            ]
        )

        return (
            response.text
            or "I couldn't understand this image."
        )

    except Exception as e:

        print("=" * 80)
        print("IMAGE UNDERSTANDING ERROR:")
        print(str(e))
        print("=" * 80)

        raise


# =====================================================
# AI IMAGE GENERATION
# =====================================================

def generate_image(prompt: str):

    try:

        print("=" * 80)
        print("NOVA AI IMAGE GENERATION")
        print("PROMPT:", prompt)
        print("=" * 80)

        response = gemini_client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"]
            )
        )

        # ---------------------------------------------
        # Find generated image
        # ---------------------------------------------

        for part in response.parts:

            if part.inline_data is not None:

                image = part.as_image()

                return image

        raise Exception(
            "Gemini did not return an image."
        )

    except Exception as e:

        print("=" * 80)
        print("IMAGE GENERATION ERROR:")
        print(str(e))
        print("=" * 80)

        raise


# =====================================================
# STREAMING CHAT
# =====================================================

def ask_ai_stream(messages):

    return groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        stream=True
    )


# =====================================================
# TEXT TO SPEECH
# =====================================================

def text_to_speech(text: str):

    os.makedirs(
        "uploads",
        exist_ok=True
    )

    filename = "uploads/output.mp3"

    tts = gTTS(
        text=text,
        lang="en",
        slow=False
    )

    tts.save(filename)

    return filename


# =====================================================
# SPEECH TO TEXT
# =====================================================

def speech_to_text(audio_path: str):

    with open(audio_path, "rb") as audio_file:

        transcription = (
            groq_client
            .audio
            .transcriptions
            .create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="text"
            )
        )

    return transcription


# =====================================================
# HEALTH CHECK
# =====================================================

def ai_status():

    return {
        "groq": "connected",
        "gemini": "connected",
        "vision": GEMINI_VISION_MODEL,
        "image_generation": GEMINI_IMAGE_MODEL
    }