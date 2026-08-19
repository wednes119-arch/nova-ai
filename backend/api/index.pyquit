from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base

from auth import router as auth_router
from chat import router as chat_router
from upload import router as upload_router


app = FastAPI(
    title="Nova AI API",
    version="1.0.0",
    description="Nova AI Backend API",
)


# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        # Local React development
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # Capacitor Android APK
        "https://localhost",

        # Production Frontend
        "https://nova-ai-knuv.vercel.app",

        # Production Backend
        "https://nova-ai-five-orpin.vercel.app",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(
    auth_router,
    prefix="/api"
)

app.include_router(
    chat_router,
    prefix="/api"
)

app.include_router(
    upload_router,
    prefix="/api"
)


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api")
def home():
    return {
        "status": "success",
        "message": "Nova AI API is Running 🚀"
    }