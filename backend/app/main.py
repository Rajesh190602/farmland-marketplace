import os

from app.routers.marketplace import router as marketplace_router
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import favorites
from app import cloudinary_config
from app import models
from app.database import Base, engine
from app.routers import (
    admin,
    chat,
    dashboard,
    lands,
    upload,
    users,
    notifications,
    reports,
    land_images,
    activity_logs,
    internal_tasks,
)
from app.routers import saved_searches
from app.routers import reviews
from app.routers import kyc
from app.routers import land_ownership
from app.rate_limiter import check_rate_limit


# =========================================================
# DATABASE
# =========================================================

# Create all database tables
Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Farmland Marketplace API",
    description="Backend API for Farmland Marketplace",
    version="1.0.0",
)
# =========================================================
# OPENAPI FILE UPLOAD COMPATIBILITY
# =========================================================

from fastapi.openapi.utils import get_openapi


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Swagger UI has problems rendering List[UploadFile]
    # with OpenAPI 3.1 + contentMediaType.
    # Use OpenAPI 3.0.3 for Swagger UI compatibility.
    openapi_schema["openapi"] = "3.0.3"

    components = openapi_schema.get("components", {}).get("schemas", {})

    for schema in components.values():
        if not isinstance(schema, dict):
            continue

        properties = schema.get("properties", {})

        for prop in properties.values():
            if not isinstance(prop, dict):
                continue

            # Single file upload
            if (
                prop.get("type") == "string"
                and prop.get("contentMediaType") == "application/octet-stream"
            ):
                prop.pop("contentMediaType", None)
                prop["format"] = "binary"

            # Multiple file upload: List[UploadFile]
            if prop.get("type") == "array":
                items = prop.get("items")

                if isinstance(items, dict):
                    if (
                        items.get("type") == "string"
                        and items.get("contentMediaType")
                        == "application/octet-stream"
                    ):
                        items.pop("contentMediaType", None)
                        items["format"] = "binary"

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost",
        "http://localhost",
        "capacitor://localhost",
        "https://farmland-marketplace-steel.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# STEP 77A - SENSITIVE API RATE LIMITING
# =========================================================

@app.middleware("http")
async def rate_limit_sensitive_endpoints(request, call_next):
    rate_limit_response = check_rate_limit(request)

    if rate_limit_response is not None:
        return rate_limit_response

    return await call_next(request)


# =========================================================
# SECURITY HEADERS
# =========================================================

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=()"
    )

    # HSTS should only be enabled in production HTTPS.
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    return response


# =========================================================
# UPLOADS
# =========================================================

# Create uploads folder
os.makedirs("uploads/lands", exist_ok=True)


# Serve uploaded files
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)


# =========================================================
# REGISTER ROUTERS
# =========================================================

app.include_router(users.router)
app.include_router(lands.router)
app.include_router(marketplace_router)
app.include_router(upload.router)
app.include_router(land_images.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(activity_logs.router)
app.include_router(saved_searches.router)
app.include_router(reviews.router)
app.include_router(land_ownership.router)
app.include_router(internal_tasks.router)


# =========================================================
# STEP 68 - KYC / IDENTITY VERIFICATION
# =========================================================

app.include_router(
    kyc.router
)


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "🌾 Welcome to Farmland Marketplace API",
        "docs": "/docs",
    }
# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status":"OK"
    }