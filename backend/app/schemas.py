from pydantic import BaseModel, EmailStr
from typing import Optional, List


# =========================
# LAND UPDATE
# =========================

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
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    mobile: str
    email: EmailStr

    class Config:
        from_attributes = True


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


# =========================
# LAND IMAGE SCHEMA
# =========================

class LandImageResponse(BaseModel):
    id: int
    image_url: str

    class Config:
        from_attributes = True


# =========================
# LAND SCHEMAS
# =========================

class LandCreate(BaseModel):
    title: str
    description: str

    # Keep this for compatibility
    image_url: Optional[str] = None

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

    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LandResponse(BaseModel):
    id: int
    title: str
    description: str

    # Existing field (temporary)
    image_url: Optional[str] = None

    # New field for multiple images
    images: List[LandImageResponse] = []

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

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    owner_id: int

    class Config:
        from_attributes = True
# =========================
# CHAT SCHEMAS
# =========================

class ConversationCreate(BaseModel):
    land_id: int


class MessageCreate(BaseModel):
    conversation_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    message: str
    is_read: bool

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    buyer_id: int
    farmer_id: int
    land_id: int

    class Config:
        from_attributes = True