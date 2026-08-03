from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Chat
from schemas import CreateChat

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/new")
def create_chat(chat: CreateChat, db: Session = Depends(get_db)):

    # Abhi temporary user_id = 1 use kar rahe hain.
    # JWT connect karne ke baad ye logged-in user se aayega.

    new_chat = Chat(
        user_id=1,
        title=chat.title
    )

    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)

    return {
        "status": "success",
        "chat_id": new_chat.id,
        "title": new_chat.title
    }