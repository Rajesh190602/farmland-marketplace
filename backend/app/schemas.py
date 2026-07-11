from pydantic import BaseModel


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
    owner_id: int

    class Config:
        from_attributes = True