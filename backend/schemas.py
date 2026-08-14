from pydantic import BaseModel, EmailStr
from typing import Optional


# ==========================================
# Authentication
# ==========================================

class UserSignup(BaseModel):
    fullname: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ==========================================
# Chat
# ==========================================

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


# ==========================================
# Streaming Chat
# ==========================================

class ChatRequest(BaseModel):
    message: str


# ==========================================
# Files
# ==========================================

class FileResponse(BaseModel):
    id: int
    filename: str

    class Config:
        from_attributes = True


# ==========================================
# PDF Chat
# ==========================================

class AskPdf(BaseModel):
    file_id: int
    question: str


# ==========================================
# Image Understanding
# ==========================================

class AskImage(BaseModel):
    file_id: int
    question: str


# ==========================================
# Text To Speech
# ==========================================

class TTSRequest(BaseModel):
    text: str


# ==========================================
# Speech To Text
# ==========================================

class SpeechResponse(BaseModel):
    status: str
    text: str


class RegenerateMessage(BaseModel):
    chat_id: int   