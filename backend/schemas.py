from pydantic import BaseModel, EmailStr
from typing import Optional


# =====================================================
# AUTHENTICATION
# =====================================================

class UserSignup(BaseModel):
    fullname: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# =====================================================
# CHAT
# =====================================================

class CreateChat(BaseModel):
    title: Optional[str] = "New Chat"


class ChatResponse(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True


class SendMessage(BaseModel):
    chat_id: int
    message: str


class MessageResponse(BaseModel):
    role: str
    content: str

    class Config:
        from_attributes = True


class RenameChat(BaseModel):
    title: str


# =====================================================
# STREAMING CHAT
# =====================================================

class ChatRequest(BaseModel):
    message: str


# =====================================================
# FILES
# =====================================================

class FileResponse(BaseModel):
    id: int
    filename: str

    class Config:
        from_attributes = True


# =====================================================
# PDF CHAT
# =====================================================

class AskPdf(BaseModel):
    file_id: int
    question: str


# =====================================================
# IMAGE UNDERSTANDING
# =====================================================

class AskImage(BaseModel):
    file_id: int
    question: str


# =====================================================
# IMAGE GENERATION
# =====================================================

class GenerateImageRequest(BaseModel):
    prompt: str


# =====================================================
# TEXT TO SPEECH
# =====================================================

class TTSRequest(BaseModel):
    text: str


# =====================================================
# SPEECH TO TEXT
# =====================================================

class SpeechResponse(BaseModel):
    status: str
    text: str


# =====================================================
# REGENERATE MESSAGE
# =====================================================

class RegenerateMessage(BaseModel):
    chat_id: int