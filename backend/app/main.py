from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import Base, engine
from app.routers import users, lands,upload,dashboard

# Create FastAPI application
app = FastAPI(
    title="Farmland Marketplace API",
    description="Backend API for Farmland Marketplace",
    version="1.0.0"
)

# -------------------------
# Enable CORS
# -------------------------
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://farmland-marketplace-mdnq.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create uploads folder automatically
os.makedirs("uploads/lands", exist_ok=True)

# Serve uploaded files
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

# Register Routers
app.include_router(users.router)
app.include_router(lands.router)
app.include_router(upload.router)
app.include_router(dashboard.router)



@app.get("/")
def root():
    return {
        "message": "🌾 Welcome to Farmland Marketplace API",
        "docs": "/docs"
    }