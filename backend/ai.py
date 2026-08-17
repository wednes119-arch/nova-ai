import os
from dotenv import load_dotenv

from groq import Groq
from google import genai
from PIL import Image
from gtts import gTTS

load_dotenv()

# ==========================================
# Clients
# ==========================================

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

GROQ_MODEL = "openai/gpt-oss-20b"

# ==========================================
# Normal Chat (Groq)
# ==========================================

def ask_ai(messages):

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024
    )

    return response.choices[0].message.content


# ==========================================
# Generate Chat Title
# ==========================================

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


# ==========================================
# Chat With PDF (Groq)
# ==========================================

def ask_pdf(pdf_text: str, question: str):

    # Limit PDF size to avoid context overflow
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


# ==========================================
# Image Understanding (Gemini Vision)
# ==========================================

def ask_image(image_path: str, question: str):

    image = Image.open(image_path)

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            image,
            question
        ]
    )

    return response.text


# ==========================================
# Streaming Response (Groq)
# ==========================================

def ask_ai_stream(messages):

    return groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        stream=True
    )

# ==========================================
# Text To Speech
# ==========================================

def text_to_speech(text: str):

    os.makedirs("uploads", exist_ok=True)

    filename = "uploads/output.mp3"

    tts = gTTS(
        text=text,
        lang="en",
        slow=False
    )

    tts.save(filename)

    return filename


# ==========================================
# Speech To Text (Groq Whisper)
# ==========================================

def speech_to_text(audio_path: str):

    with open(audio_path, "rb") as audio_file:

        transcription = groq_client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3-turbo",
            response_format="text"
        )

    return transcription


# ==========================================
# Health Check
# ==========================================

def ai_status():
    return {
        "groq": "connected",
        "gemini": "connected",
    }

import os
from dotenv import load_dotenv

load_dotenv()

