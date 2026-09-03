from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    Boolean,
    DateTime,
    Text,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime


# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)
    profile_image = Column(String, nullable=True)

    mobile = Column(
        String,
        unique=True,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default="farmer"
    )
    is_suspended = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    last_seen = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # -----------------------------------------------------
    # Existing relationships
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # Phase 2 - Land Reports
    # -----------------------------------------------------

    land_reports = relationship(
        "LandReport",
        back_populates="reporter",
        foreign_keys="LandReport.reporter_id",
        cascade="all, delete-orphan"
    )

    # -----------------------------------------------------
    # Phase 2 - User Reports
    # -----------------------------------------------------

    user_reports_submitted = relationship(
        "UserReport",
        foreign_keys="UserReport.reporter_id",
        back_populates="reporter",
        cascade="all, delete-orphan"
    )

    user_reports_received = relationship(
        "UserReport",
        foreign_keys="UserReport.reported_user_id",
        back_populates="reported_user",
        cascade="all, delete-orphan"
    )

    # -----------------------------------------------------
    # Phase 6 - Reviews & Ratings
    # -----------------------------------------------------

    reviews_written = relationship(
        "UserReview",
        foreign_keys="UserReview.reviewer_id",
        back_populates="reviewer",
        cascade="all, delete-orphan"
    )

    reviews_received = relationship(
        "UserReview",
        foreign_keys="UserReview.reviewed_user_id",
        back_populates="reviewed_user",
        cascade="all, delete-orphan"
    )
        # -----------------------------------------------------
    # Phase 2 - User Blocks
    # -----------------------------------------------------

    blocks_created = relationship(
        "UserBlock",
        foreign_keys="UserBlock.blocker_id",
        back_populates="blocker",
        cascade="all, delete-orphan"
    )

    blocks_received = relationship(
        "UserBlock",
        foreign_keys="UserBlock.blocked_id",
        back_populates="blocked",
        cascade="all, delete-orphan"
    )
# =========================================================
# PHASE 2
# USER BLOCK
# =========================================================

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    blocker_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    blocked_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    blocker = relationship(
        "User",
        foreign_keys=[blocker_id],
        back_populates="blocks_created"
    )
    blocked = relationship(
        "User",
        foreign_keys=[blocked_id],
        back_populates="blocks_received"
    )
    

    
    __table_args__ = (
        UniqueConstraint(
            "blocker_id",
            "blocked_id",
            name="uq_user_block"
        ),
    )




# =========================================================
# LAND
# =========================================================

class Land(Base):
    __tablename__ = "lands"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        String
    )

    image_url = Column(
        String,
        nullable=True
    )

    price = Column(
        Float,
        nullable=False
    )

    area = Column(
        Float,
        nullable=False
    )

    village = Column(
        String,
        nullable=False
    )

    mandal = Column(
        String,
        nullable=False
    )

    district = Column(
        String,
        nullable=False
    )

    state = Column(
        String,
        nullable=False
    )

    pincode = Column(
        String
    )

    survey_number = Column(
        String
    )

    soil_type = Column(
        String
    )

    water_source = Column(
        String
    )

    crop_type = Column(
        String
    )

    # Existing approval workflow.
    #
    # pending
    # approved
    # rejected
    # changes_requested
    status = Column(
        String,
        default="pending"
    )
    is_published = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    

    rejection_reason = Column(
        Text,
        nullable=True
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    owner = relationship(
        "User",
        back_populates="lands"
    )

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

    # -----------------------------------------------------
    # Phase 1 marketplace relationships
    # -----------------------------------------------------

    availability = relationship(
        "LandAvailability",
        back_populates="land",
        uselist=False,
        cascade="all, delete-orphan"
    )

    inquiries = relationship(
        "LandInquiry",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    offers = relationship(
        "LandOffer",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    site_visits = relationship(
        "SiteVisit",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    # -----------------------------------------------------
    # Phase 6 - Reviews & Ratings
    # -----------------------------------------------------

    reviews = relationship(
        "UserReview",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    # -----------------------------------------------------
    # Phase 6 - Listing Views
    # -----------------------------------------------------

    listing_views = relationship(
        "ListingView",
        back_populates="land",
        cascade="all, delete-orphan"
    )

    # -----------------------------------------------------
    # Phase 2 - Land Reports
    # -----------------------------------------------------

    reports = relationship(
        "LandReport",
        back_populates="land",
        cascade="all, delete-orphan"
    )


# =========================================================
# EMAIL VERIFICATION
# =========================================================

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    otp = Column(
        String,
        nullable=False
    )

    verified = Column(
        Boolean,
        default=False
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =========================================================
# LAND IMAGES
# =========================================================

class LandImage(Base):
    __tablename__ = "land_images"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    image_url = Column(
        String,
        nullable=False
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id")
    )

    land = relationship(
        "Land",
        back_populates="images"
    )


# =========================================================
# CHAT - CONVERSATION
# =========================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    buyer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    farmer_id = Column(
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
        DateTime,
        default=datetime.utcnow
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )


    # -----------------------------------------------------
    # Phase 4 - Conversation Mutes
    # Each participant can mute the same conversation independently.
    # -----------------------------------------------------

    mutes = relationship(
        "ConversationMute",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )


# =========================================================
# PHASE 4
# CONVERSATION MUTE
# =========================================================

class ConversationMute(Base):
    __tablename__ = "conversation_mutes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    conversation = relationship(
        "Conversation",
        back_populates="mutes"
    )

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_mute"
        ),
    )


# =========================================================
# PHASE 4
# CONVERSATION ARCHIVE
# Each participant can archive independently.
# Archiving does NOT delete the conversation or messages.
# =========================================================

class ConversationArchive(Base):
    __tablename__ = "conversation_archives"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    archived_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    conversation = relationship("Conversation")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_archive"
        ),
    )


# =========================================================
# PHASE 4
# CONVERSATION DELETE FOR ME
# Each participant can delete their own copy independently.
# Deleting does NOT delete the shared conversation or messages.
# =========================================================

class ConversationDeletion(Base):
    __tablename__ = "conversation_deletions"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    deleted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_deletion"),
    )


# =========================================================
# CHAT - MESSAGE
# =========================================================

class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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


# =========================================================
# FAVORITES
# =========================================================

class Favorite(Base):
    __tablename__ = "favorites"

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


# =========================================================
# NOTIFICATIONS
# =========================================================

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

    # Notification navigation
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

    user = relationship(
        "User"
    )


# =========================================================
# ACTIVITY LOG
# =========================================================

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

    # Export / Archive
    is_archived = Column(
        Boolean,
        default=False,
        nullable=False
    )

    archived_at = Column(
        DateTime,
        nullable=True
    )

    user = relationship(
        "User",
        back_populates="activity_logs"
    )


# =========================================================
# PHASE 1
# LAND AVAILABILITY
# =========================================================
#
# We are intentionally NOT adding a new column directly
# to the existing "lands" table.
#
# This avoids breaking the existing database schema.
#
# Approval status remains in Land.status.
#
# Marketplace availability is stored separately:
#
# available
# reserved
# sold
#
# =========================================================

class LandAvailability(Base):
    __tablename__ = "land_availability"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        unique=True,
        index=True
    )

    status = Column(
        String,
        default="available",
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    land = relationship(
        "Land",
        back_populates="availability"
    )


# =========================================================
# PHASE 1
# BUYER INQUIRY
# =========================================================

class LandInquiry(Base):
    __tablename__ = "land_inquiries"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    buyer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    message = Column(
        Text,
        nullable=False
    )

    status = Column(
        String,
        default="pending",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    land = relationship(
        "Land",
        back_populates="inquiries"
    )

    buyer = relationship(
        "User",
        foreign_keys=[buyer_id]
    )


# =========================================================
# PHASE 1
# BUYER OFFER
# =========================================================

class LandOffer(Base):
    __tablename__ = "land_offers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    buyer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Buyer's proposed price
    amount = Column(
        Float,
        nullable=False
    )

    message = Column(
        Text,
        nullable=True
    )

    status = Column(
        String,
        default="pending",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    land = relationship(
        "Land",
        back_populates="offers"
    )

    buyer = relationship(
        "User",
        foreign_keys=[buyer_id]
    )


# =========================================================
# PHASE 1
# SITE VISIT
# =========================================================

class SiteVisit(Base):
    __tablename__ = "site_visits"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    buyer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    requested_date = Column(
        DateTime,
        nullable=False
    )

    message = Column(
        Text,
        nullable=True
    )

    status = Column(
        String,
        default="pending",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    land = relationship(
        "Land",
        back_populates="site_visits"
    )

    buyer = relationship(
        "User",
        foreign_keys=[buyer_id]
    )

# =========================================================
# PHASE 2
# LAND REPORT
# =========================================================

class LandReport(Base):
    __tablename__ = "land_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    reporter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Reason selected by the user when reporting a land listing.
    reason = Column(
        String,
        nullable=False
    )

    # Optional additional information from the reporter.
    description = Column(
        Text,
        nullable=True
    )

    # pending / resolved / dismissed
    status = Column(
        String,
        default="pending",
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    land = relationship(
        "Land",
        back_populates="reports"
    )

    reporter = relationship(
        "User",
        back_populates="land_reports",
        foreign_keys=[reporter_id]
    )
# =========================================================
# PHASE 2
# USER REPORT
# =========================================================

class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # User who submitted the report
    reporter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # User being reported
    reported_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Reason selected by the reporter
    reason = Column(
        String,
        nullable=False
    )

    # Optional additional information
    description = Column(
        Text,
        nullable=True
    )

    # pending / resolved / dismissed
    status = Column(
        String,
        default="pending",
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    reporter = relationship(
        "User",
        foreign_keys=[reporter_id],
        back_populates="user_reports_submitted"
    )

    reported_user = relationship(
        "User",
        foreign_keys=[reported_user_id],
        back_populates="user_reports_received"
    )
# =========================================================
# RECENTLY VIEWED LANDS
# =========================================================

class RecentlyViewedLand(Base):
    __tablename__ = "recently_viewed_lands"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    viewed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    # One user should have only one record
    # for each land.
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "land_id",
            name="uq_recently_viewed_user_land"
        ),
    )

    user = relationship(
        "User",
        foreign_keys=[user_id]
    )

    land = relationship(
        "Land",
        foreign_keys=[land_id]
    )
# =========================================================
# PHASE 6
# LISTING VIEWS
# =========================================================

class ListingView(Base):
    """
    Stores one view per authenticated user and listing.

    A unique user/listing pair prevents repeated refreshes from
    artificially inflating the listing's view count. The viewed_at
    timestamp is updated when the same user opens the listing again.
    """

    __tablename__ = "listing_views"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    viewed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    user = relationship(
        "User",
        foreign_keys=[user_id]
    )

    land = relationship(
        "Land",
        back_populates="listing_views",
        foreign_keys=[land_id]
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "land_id",
            name="uq_listing_view_user_land"
        ),
    )


# =========================================================
# STEP 19
# SAVED SEARCHES
# =========================================================

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # User who saved the search
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # User-defined name for the saved search
    name = Column(
        String,
        nullable=False
    )

    # Search filters
    district = Column(
        String,
        nullable=True
    )

    village = Column(
        String,
        nullable=True
    )

    mandal = Column(
        String,
        nullable=True
    )

    crop_type = Column(
        String,
        nullable=True
    )

    soil_type = Column(
        String,
        nullable=True
    )

    water_source = Column(
        String,
        nullable=True
    )

    min_price = Column(
        Float,
        nullable=True
    )

    max_price = Column(
        Float,
        nullable=True
    )

    min_area = Column(
        Float,
        nullable=True
    )

    max_area = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        foreign_keys=[user_id]
    )

# =========================================================
# PHASE 6
# USER REVIEWS & RATINGS
# =========================================================
# A review is written by one marketplace user about another
# marketplace user and is tied to a specific land listing.
# This supports Buyer -> Farmer and Farmer -> Buyer ratings.
# =========================================================

class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    reviewed_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    land_id = Column(
        Integer,
        ForeignKey("lands.id"),
        nullable=False,
        index=True
    )

    rating = Column(
        Integer,
        nullable=False
    )

    comment = Column(
        Text,
        nullable=True
    )

    # published / hidden
    status = Column(
        String,
        default="published",
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewer_id],
        back_populates="reviews_written"
    )

    reviewed_user = relationship(
        "User",
        foreign_keys=[reviewed_user_id],
        back_populates="reviews_received"
    )

    land = relationship(
        "Land",
        back_populates="reviews"
    )

    __table_args__ = (
        UniqueConstraint(
            "reviewer_id",
            "reviewed_user_id",
            "land_id",
            name="uq_user_review_reviewer_reviewed_land"
        ),
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_user_review_rating_1_5"
        ),
    )
