import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import favorites
from app import cloudinary_config
from app import models
from app.database import Base, engine
from app.routers import admin, chat, dashboard, lands, upload, users,notifications

# Create all database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title="Farmland Marketplace API",
    description="Backend API for Farmland Marketplace",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Old deployment
    "https://farmland-marketplace-mdnq.vercel.app",

    # Current deployment
    "https://farmland-marketplace-steel.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads folder
os.makedirs("uploads/lands", exist_ok=True)

# Serve uploaded files
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)

# Register routers
app.include_router(users.router)
app.include_router(lands.router)
app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(favorites.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "message": "🌾 Welcome to Farmland Marketplace API",
        "docs": "/docs",
    }