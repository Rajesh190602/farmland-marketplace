from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy import Column, Integer, String
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    mobile = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="farmer")
class Land(Base):
    __tablename__ = "lands"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(String)
    image_url = Column(String, nullable=True)
    price = Column(Float, nullable=False)

    area = Column(Float, nullable=False)
    village = Column(String, nullable=False)
    mandal = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    pincode = Column(String)

    survey_number = Column(String)

    soil_type = Column(String)
    water_source = Column(String)
    crop_type = Column(String)

    owner_id = Column(Integer, ForeignKey("users.id"))
class LandImage(Base):
    __tablename__ = "land_images"

    id = Column(Integer, primary_key=True, index=True)

    image_url = Column(String, nullable=False)

    land_id = Column(Integer, ForeignKey("lands.id"))