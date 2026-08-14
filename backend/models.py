from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


# =========================================================
# USER MODEL
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    fullname = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String(255),
        nullable=False
    )

    # =====================================================
    # EMAIL VERIFICATION
    # =====================================================

    is_verified = Column(
        Integer,
        default=0,
        nullable=False
    )

    otp_code = Column(
        String(255),
        nullable=True
    )

    otp_expires_at = Column(
        DateTime,
        nullable=True
    )

    # =====================================================
    # CHAT HISTORY SETTING
    # =====================================================

    chat_history_enabled = Column(
        Integer,
        default=1,
        nullable=False
    )

    # =====================================================
    # CREATED DATE
    # =====================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# UPLOADED FILE MODEL
# =========================================================

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    filename = Column(
        String,
        nullable=False
    )

    filepath = Column(
        String,
        nullable=False
    )

    filetype = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User"
    )


# =========================================================
# CHAT MODEL
# =========================================================

class Chat(Base):
    __tablename__ = "chats"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String(255),
        default="New Chat",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User"
    )

    messages = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete-orphan"
    )


# =========================================================
# MESSAGE MODEL
# =========================================================

class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    chat_id = Column(
        Integer,
        ForeignKey("chats.id"),
        nullable=False
    )

    role = Column(
        String(20),
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    chat = relationship(
        "Chat",
        back_populates="messages"
    )