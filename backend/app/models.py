from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime,Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    mobile = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="farmer")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    last_seen = Column(
        DateTime(timezone=True),
        nullable=True
    )

    lands = relationship(
        "Land",
        back_populates="owner",
        cascade="all, delete"
    )

    favorites = relationship(
        "Favorite",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    notifications = relationship(
    "Notification",
    cascade="all, delete-orphan"
)
    activity_logs = relationship(
    "ActivityLog",
    back_populates="user",
    cascade="all, delete-orphan"
)

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
    status = Column(String, default="pending")

    rejection_reason = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="lands")

    images = relationship(
        "LandImage",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    favorites = relationship(
        "Favorite",
        back_populates="land",
        cascade="all, delete-orphan"
    )

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    otp = Column(String, nullable=False)
    verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LandImage(Base):
    __tablename__ = "land_images"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String, nullable=False)

    land_id = Column(Integer, ForeignKey("lands.id"))

    land = relationship("Land", back_populates="images")
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    land_id = Column(Integer, ForeignKey("lands.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # Normal text message
    message = Column(
        String,
        nullable=True
    )

    # text / image / file
    message_type = Column(
        String,
        default="text",
        nullable=False
    )

    # Cloudinary URL
    file_url = Column(
        String,
        nullable=True
    )

    # Original uploaded filename
    file_name = Column(
        String,
        nullable=True
    )

    # File size in bytes
    file_size = Column(
        Integer,
        nullable=True
    )

    # MIME type
    file_type = Column(
        String,
        nullable=True
    )

    is_read = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )
class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    user = relationship(
        "User",
        back_populates="favorites"
    )

    land = relationship(
        "Land",
        back_populates="favorites"
    )
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String,
        nullable=False
    )

    message = Column(
        String,
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False
    )

    # ==========================================
    # Notification Navigation
    # ==========================================

    target_type = Column(
        String,
        nullable=True
    )

    target_id = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    user = relationship("User")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    action = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    target_type = Column(
        String,
        nullable=True
    )

    target_id = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # ==========================
    # Export / Archive
    # ==========================

    is_archived = Column(
        Boolean,
        default=False,
        nullable=False
    )

    archived_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    user = relationship(
        "User",
        back_populates="activity_logs"
    )
   