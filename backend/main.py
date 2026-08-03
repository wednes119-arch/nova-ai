from fastapi import FastAPI
from database import engine
from models import Base
from auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nova AI API",
    version="1.0.0"
)

app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Nova AI API is Running 🚀"
    }