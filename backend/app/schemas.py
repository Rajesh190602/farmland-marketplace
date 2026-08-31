from pydantic import BaseModel, EmailStr
from typing import Optional, List,Literal
from datetime import datetime
from typing import Optional
class ProfileUpdate(BaseModel):
    full_name: str
    mobile: str
class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: str

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
class LandReview(BaseModel):
    reason: str




# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    full_name: str
    mobile: str
    email: EmailStr
    password: str
    role: Literal["farmer", "buyer"] = "farmer"


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

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None

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
    status: str
    rejection_reason: Optional[str] = None
    owner_id: int

    class Config:
        from_attributes = True
# =========================
# CHAT SCHEMAS
# =========================

class ConversationCreate(BaseModel):
    land_id: int
    buyer_id: Optional[int] = None
class FarmerReplyConversationCreate(BaseModel):
    land_id: int
    buyer_id: int

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


# =========================================================
# PHASE 1 - MARKETPLACE SCHEMAS
# =========================================================


# =========================================================
# LAND AVAILABILITY
# =========================================================

class LandAvailabilityResponse(BaseModel):
    land_id: int
    status: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================
# LAND INQUIRY
# =========================================================

class LandInquiryCreate(BaseModel):
    land_id: int
    message: str


class LandInquiryResponse(BaseModel):
    id: int
    land_id: int
    buyer_id: int
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LandInquiryStatusUpdate(BaseModel):
    status: str


# =========================================================
# LAND OFFER
# =========================================================

class LandOfferCreate(BaseModel):
    land_id: int
    amount: float
    message: Optional[str] = None


class LandOfferResponse(BaseModel):
    id: int
    land_id: int
    buyer_id: int
    amount: float
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LandOfferStatusUpdate(BaseModel):
    status: str


# =========================================================
# SITE VISIT
# =========================================================

class SiteVisitCreate(BaseModel):
    land_id: int
    requested_date: datetime
    message: Optional[str] = None


class SiteVisitResponse(BaseModel):
    id: int
    land_id: int
    buyer_id: int
    requested_date: datetime
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SiteVisitStatusUpdate(BaseModel):
    status: str

# =========================================================
# PHASE 2 - LAND REPORT
# =========================================================

class LandReportCreate(BaseModel):
    land_id: int
    reason: str
    description: Optional[str] = None


class LandReportResponse(BaseModel):
    id: int
    land_id: int
    reporter_id: int
    reason: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
