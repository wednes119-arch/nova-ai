from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base

from auth import router as auth_router
from chat import router as chat_router
from upload import router as upload_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routers
app.include_router(chat_router)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nova AI API",
    version="1.0.0",
    description="Nova AI Backend API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(upload_router)

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Nova AI API is Running 🚀"
    }