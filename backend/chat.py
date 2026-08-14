from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Chat, Message, User

from schemas import (
    CreateChat,
    SendMessage,
    RenameChat,
    RegenerateMessage,
)

from auth import get_current_user

from ai import (
    ask_ai,
    ask_ai_stream,
    generate_title,
)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)

SYSTEM_PROMPT = (
    "You are Nova AI, a professional AI assistant. "
    "Give clear, accurate and helpful answers. "
    "Use Markdown when appropriate."
)


# =====================================================
# Create Chat
# =====================================================

@router.post("/new")
def create_chat(
    chat: CreateChat,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    new_chat = Chat(
        user_id=current_user.id,
        title=chat.title or "New Chat",
    )

    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)

    return {
        "status": "success",
        "chat_id": new_chat.id,
        "title": new_chat.title,
    }


# =====================================================
# Send Message
# =====================================================

@router.post("/send")
def send_message(
    data: SendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == data.chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    user = Message(
        chat_id=chat.id,
        role="user",
        content=data.message,
    )

    db.add(user)
    db.flush()

    total = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .count()
    )

    if total == 1 and (
        chat.title == "New Chat"
        or not chat.title
    ):
        try:
            chat.title = generate_title(data.message)
        except Exception:
            chat.title = data.message[:30]

    history = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for msg in history[-30:]:
        messages.append(
            {
                "role": msg.role,
                "content": msg.content,
            }
        )

    try:
        answer = ask_ai(messages)

    except Exception as e:
        answer = f"AI Error: {str(e)}"

    assistant = Message(
        chat_id=chat.id,
        role="assistant",
        content=answer,
    )

    db.add(assistant)
    db.commit()

    return {
        "status": "success",
        "assistant": answer,
        "title": chat.title,
    }

# =====================================================
# Real Streaming Endpoint
# =====================================================

@router.post("/stream")
def stream_message(
    data: SendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == data.chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    # -----------------------------
    # Save User Message
    # -----------------------------

    user = Message(
        chat_id=chat.id,
        role="user",
        content=data.message,
    )

    db.add(user)
    db.flush()

    total = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .count()
    )

    if total == 1 and (
        chat.title == "New Chat"
        or not chat.title
    ):
        try:
            chat.title = generate_title(data.message)
        except Exception:
            chat.title = data.message[:30]

    history = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for msg in history[-30:]:
        messages.append(
            {
                "role": msg.role,
                "content": msg.content,
            }
        )

    db.commit()

    # -----------------------------
    # Streaming Generator
    # -----------------------------

    def generate():

        full_answer = ""

        try:

            stream = ask_ai_stream(messages)

            for chunk in stream:

                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta

                if (
                    delta is None
                    or delta.content is None
                ):
                    continue

                token = delta.content

                full_answer += token

                yield token

        except Exception as e:

            yield f"\n\nAI Error: {str(e)}"

            return

        assistant = Message(
            chat_id=chat.id,
            role="assistant",
            content=full_answer,
        )

        db.add(assistant)
        db.commit()

    return StreamingResponse(
        generate(),
        media_type="text/plain",
    )

# =====================================================
# Chat History
# =====================================================

@router.get("/history/{chat_id}")
def get_chat_history(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    history = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "status": "success",
        "chat": {
            "id": chat.id,
            "title": chat.title,
        },
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at,
            }
            for msg in history
        ],
    }


@router.get("/list")
def get_chat_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # History disabled
    if not current_user.chat_history_enabled:
        return {
            "status": "success",
            "total": 0,
            "chats": []
        }

    chats = (
        db.query(Chat)
        .filter(
            Chat.user_id == current_user.id
        )
        .order_by(Chat.created_at.desc())
        .all()
    )

    return {
        "status": "success",
        "total": len(chats),
        "chats": [
            {
                "id": chat.id,
                "title": chat.title,
                "created_at": chat.created_at,
            }
            for chat in chats
        ],
    }


# =====================================================
# Rename Chat
# =====================================================

@router.put("/rename/{chat_id}")
def rename_chat(
    chat_id: int,
    data: RenameChat,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    title = data.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Title cannot be empty.",
        )

    chat.title = title

    db.commit()
    db.refresh(chat)

    return {
        "status": "success",
        "chat": {
            "id": chat.id,
            "title": chat.title,
        },
    }


# =====================================================
# CLEAR ALL USER CHAT DATA
# =====================================================

@router.delete("/clear-all")
def clear_all_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chats = (
        db.query(Chat)
        .filter(
            Chat.user_id == current_user.id
        )
        .all()
    )

    for chat in chats:
        db.delete(chat)

    db.commit()

    return {
        "status": "success",
        "message": "All chat data deleted successfully",
    }


# =====================================================
# Delete Single Chat
# =====================================================

@router.delete("/{chat_id}")
def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = (
        db.query(Chat)
        .filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    db.delete(chat)
    db.commit()

    return {
        "status": "success",
        "message": "Chat deleted successfully",
    }
# =====================================================
# Regenerate Last Response
# =====================================================

@router.post("/regenerate")
def regenerate_response(
    data: RegenerateMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == data.chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    # -------------------------------------
    # Delete Last Assistant Message
    # -------------------------------------

    last_ai = (
        db.query(Message)
        .filter(
            Message.chat_id == chat.id,
            Message.role == "assistant",
        )
        .order_by(Message.created_at.desc())
        .first()
    )

    if last_ai:
        db.delete(last_ai)
        db.commit()

    # -------------------------------------
    # Build Conversation
    # -------------------------------------

    history = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for msg in history[-30:]:
        messages.append(
            {
                "role": msg.role,
                "content": msg.content,
            }
        )

    # -------------------------------------
    # Generate Again
    # -------------------------------------

    try:

        answer = ask_ai(messages)

    except Exception as e:

        answer = f"AI Error: {str(e)}"

    assistant = Message(
        chat_id=chat.id,
        role="assistant",
        content=answer,
    )

    db.add(assistant)
    db.commit()

    return {
        "status": "success",
        "assistant": answer,
    }

    # =====================================================
# CONTINUE LAST RESPONSE
# =====================================================

@router.post("/continue")
def continue_response(
    data: RegenerateMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == data.chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    # Last assistant message
    last_ai = (
        db.query(Message)
        .filter(
            Message.chat_id == chat.id,
            Message.role == "assistant",
        )
        .order_by(Message.created_at.desc())
        .first()
    )

    if not last_ai:
        raise HTTPException(
            status_code=400,
            detail="No assistant response to continue.",
        )

    # Conversation history
    history = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for msg in history[-30:]:
        messages.append(
            {
                "role": msg.role,
                "content": msg.content,
            }
        )

    # Tell AI to continue
    messages.append(
        {
            "role": "user",
            "content": (
                "Continue your previous response from where "
                "you stopped. Do not repeat the previous content. "
                "Continue naturally."
            ),
        }
    )

    try:

        answer = ask_ai(messages)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    # Append continuation
    last_ai.content = (
        last_ai.content.rstrip()
        + "\n\n"
        + answer
    )

    db.commit()
    db.refresh(last_ai)

    return {
        "status": "success",
        "assistant": last_ai.content,
    }


# =====================================================
# CLEAR CONVERSATION
# =====================================================

@router.delete("/clear/{chat_id}")
def clear_conversation(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    chat = (
        db.query(Chat)
        .filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found",
        )

    db.query(Message).filter(
        Message.chat_id == chat_id
    ).delete(
        synchronize_session=False
    )

    db.commit()

    return {
        "status": "success",
        "message": "Conversation cleared successfully",
    }

    # =====================================================
# EDIT USER MESSAGE
# =====================================================

@router.put("/edit-message/{message_id}")
def edit_user_message(
    message_id: int,
    data: SendMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    message = (
        db.query(Message)
        .join(Chat)
        .filter(
            Message.id == message_id,
            Message.role == "user",
            Chat.user_id == current_user.id,
        )
        .first()
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found",
        )

    chat_id = message.chat_id

    # Delete messages after edited message
    messages_after = (
        db.query(Message)
        .filter(
            Message.chat_id == chat_id,
            Message.id > message.id,
        )
        .all()
    )

    for msg in messages_after:
        db.delete(msg)

    # Update user message
    message.content = data.message

    db.flush()

    # Rebuild conversation
    history = (
        db.query(Message)
        .filter(
            Message.chat_id == chat_id
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    ai_messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for msg in history[-30:]:
        ai_messages.append(
            {
                "role": msg.role,
                "content": msg.content,
            }
        )

    try:

        answer = ask_ai(ai_messages)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    assistant = Message(
        chat_id=chat_id,
        role="assistant",
        content=answer,
    )

    db.add(assistant)

    db.commit()
    db.refresh(assistant)

    return {
        "status": "success",
        "assistant": answer,
    }


# =====================================================
# CLEAR ALL USER CHAT DATA
# =====================================================

@router.delete("/clear-all")
def clear_all_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    chats = (
        db.query(Chat)
        .filter(
            Chat.user_id == current_user.id
        )
        .all()
    )

    for chat in chats:
        db.delete(chat)

    db.commit()

    return {
        "status": "success",
        "message": "All chat data deleted successfully"
    }