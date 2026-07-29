from pydantic import BaseModel
from typing import Optional
from pydantic import BaseModel, EmailStr


class LandUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    area: Optional[float] = None

    village: Optional[str] = None
    mandal: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    survey_number: Optional[str] = None

    soil_type: Optional[str] = None
    water_source: Optional[str] = None
    crop_type: Optional[str] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    image_url: Optional[str] = None


# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    full_name: str
    mobile: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    mobile: str
    email: str

class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class Config:
        from_attributes = True


# =========================
# LAND SCHEMAS
# =========================

class LandCreate(BaseModel):
    title: str
    description: str
    image_url: str | None = None

    price: float
    area: float

    village: str
    mandal: str
    district: str
    state: str
    pincode: str

    survey_number: str

    soil_type: str
    water_source: str
    crop_type: str

    # Google Maps
    latitude: float | None = None
    longitude: float | None = None

class LandResponse(BaseModel):
    id: int
    title: str
    description: str
    image_url: str | None = None

    price: float
    area: float

    village: str
    mandal: str
    district: str
    state: str
    pincode: str

    survey_number: str

    soil_type: str
    water_source: str
    crop_type: str

    # Google Maps
    latitude: float | None = None
    longitude: float | None = None

    owner_id: int

    class Config:
        from_attributes = True