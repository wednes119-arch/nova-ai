from pydantic import BaseModel, EmailStr


class UserSignup(BaseModel):
    fullname: str
    email: EmailStr
    password: str