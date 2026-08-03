from pydantic import BaseModel, EmailStr


class UserSignup(BaseModel):
    fullname: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str



class CreateChat(BaseModel):
    title: str = "New Chat"


class ChatResponse(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True    