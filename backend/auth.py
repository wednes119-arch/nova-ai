from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
from models import User
from schemas import UserSignup

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):

    hashed_password = pwd_context.hash(user.password)

    new_user = User(
        fullname=user.fullname,
        email=user.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully",
        "user_id": new_user.id
    }