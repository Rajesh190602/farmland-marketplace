from fastapi import APIRouter, Depends,HTTPException,Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.auth import get_current_admin
from app.database import get_db
from app.models import User, Land, Notification,LandImage,Conversation,ActivityLog,Message,Favorite
from app.schemas import LandUpdate,UserUpdate,LandReview
from app.utils.activity_log import create_activity_log
from sqlalchemy import func,extract
router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    total_users = db.query(User).count()
    total_lands = db.query(Land).count()

    total_farmers = (
        db.query(User)
        .filter(User.role == "farmer")
        .count()
    )

    total_buyers = (
        db.query(User)
        .filter(User.role == "buyer")
        .count()
    )

    total_admins = (
        db.query(User)
        .filter(User.role == "admin")
        .count()
    )
    return {
        "total_users": total_users,
        "total_lands": total_lands,
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_admins": total_admins
}
@router.get("/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    total_chats = db.query(Conversation).count()

    return {
        "total_users": db.query(User).count(),

        "farmers": db.query(User)
        .filter(User.role == "farmer")
        .count(),

        "buyers": db.query(User)
        .filter(User.role == "buyer")
        .count(),

        "admins": db.query(User)
        .filter(User.role == "admin")
        .count(),

        "total_lands": db.query(Land).count(),

        "pending": db.query(Land)
        .filter(Land.status == "pending")
        .count(),

        "approved": db.query(Land)
        .filter(Land.status == "approved")
        .count(),

        "rejected": db.query(Land)
        .filter(Land.status == "rejected")
        .count(),

        "changes_requested": db.query(Land)
        .filter(
            Land.status == "changes_requested"
        )
        .count(),

        "total_chats": total_chats,
    }
# =========================================================
# Admin Recent Activity
# =========================================================

@router.get("/recent-activity")
def get_recent_activity(
    limit: int = Query(
        default=10,
        ge=1,
        le=50
    ),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    logs = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.is_archived == False
        )
        .order_by(
            ActivityLog.id.desc()
        )
        .limit(limit)
        .all()
    )

    result = []

    for log in logs:

        user = None

        if log.user_id:
            user = (
                db.query(User)
                .filter(
                    User.id == log.user_id
                )
                .first()
            )

        result.append({
            "id": log.id,

            "user_id": log.user_id,

            "user_name": (
                user.full_name
                if user
                else "System"
            ),

            "user_email": (
                user.email
                if user
                else ""
            ),

            "action": log.action,

            "description": log.description,

            "target_type": log.target_type,

            "target_id": log.target_id,

            "created_at": log.created_at,
        })

    return {
        "total": len(result),
        "activities": result,
    }
@router.get("/users")
def get_all_users(
    search: str = Query(default=""),
    role: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    query = db.query(User)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    if role:
        query = query.filter(User.role == role)

    total = query.count()

    users = (
        query
        .order_by(User.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "mobile": user.mobile,
                "role": user.role,
            }
            for user in users
        ],
    }
# ==========================
# Get User Details
# ==========================

@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    total_lands = (
        db.query(Land)
        .filter(Land.owner_id == user.id)
        .count()
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "total_lands": total_lands
    }
@router.get("/lands")
def get_all_lands(
    search: str = Query(default=""),
    status: str = Query(default=""),
    district: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    query = db.query(Land)

    if search:
        query = query.filter(
            (Land.title.ilike(f"%{search}%")) |
            (Land.village.ilike(f"%{search}%")) |
            (Land.mandal.ilike(f"%{search}%")) |
            (Land.district.ilike(f"%{search}%")) |
            (Land.survey_number.ilike(f"%{search}%"))
        )

    if status:
        query = query.filter(Land.status == status)

    if district:
        query = query.filter(
            Land.district.ilike(f"%{district}%")
        )

    total = query.count()

    lands = (
        query
        .order_by(Land.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []

    for land in lands:

        owner = (
            db.query(User)
            .filter(User.id == land.owner_id)
            .first()
        )

        result.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "rejection_reason": land.rejection_reason,

            # Existing single image
            "image_url": land.image_url,

            # New multiple-image gallery
            "images": [
                {
                    "id": image.id,
                    "image_url": image.image_url
                }
                for image in land.images
            ],

            "owner_id": land.owner_id,
            "owner_name": owner.full_name if owner else "Unknown",
            "owner_email": owner.email if owner else "",
            "owner_mobile": owner.mobile if owner else "",
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "lands": result,
    }



@router.get("/lands/pending")
def get_pending_lands(
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    query = (
        db.query(Land)
        .filter(Land.status == "pending")
    )

    # Search pending lands
    if search:
        query = query.filter(
            (Land.title.ilike(f"%{search}%")) |
            (Land.village.ilike(f"%{search}%")) |
            (Land.mandal.ilike(f"%{search}%")) |
            (Land.district.ilike(f"%{search}%")) |
            (Land.survey_number.ilike(f"%{search}%"))
        )

    # Total matching pending lands
    total = query.count()

    # Pagination
    lands = (
        query
        .order_by(Land.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []

    for land in lands:

        owner = (
            db.query(User)
            .filter(User.id == land.owner_id)
            .first()
        )

        result.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "image_url": land.image_url,
            "owner_id": land.owner_id,
            "owner_name": owner.full_name if owner else "",
            "owner_email": owner.email if owner else "",
            "owner_mobile": owner.mobile if owner else "",
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "lands": result,
    }
# ==========================
# Approve Land
# ==========================

@router.put("/lands/{land_id}/approve")
def approve_land(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "approved"
    land.rejection_reason = None

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Land Approved",
        message=(
            f'Your land "{land.title}" has been approved '
            "and is now visible to buyers."
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="APPROVE_LAND",
        description=f'Approved land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Land approved successfully",
        "status": land.status
    }
# ==========================
# Request Changes
# ==========================

@router.put("/lands/{land_id}/request-changes")
def request_changes(
    land_id: int,
    review: LandReview,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "changes_requested"
    land.rejection_reason = review.reason

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Changes Requested",
        message=(
            f'Changes have been requested for your land '
            f'"{land.title}". Reason: {review.reason}'
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="REQUEST_CHANGES",
        description=(
            f'Requested changes for land "{land.title}". '
            f"Reason: {review.reason}"
        ),
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Changes requested successfully",
        "status": land.status,
        "reason": land.rejection_reason
    }
# ==========================
# Reject Land
# ==========================

@router.put("/lands/{land_id}/reject")
def reject_land(
    land_id: int,
    review: LandReview,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "rejected"
    land.rejection_reason = review.reason

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Land Rejected",
        message=(
            f'Your land "{land.title}" has been rejected. '
            f"Reason: {review.reason}"
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="REJECT_LAND",
        description=(
            f'Rejected land "{land.title}". '
            f"Reason: {review.reason}"
        ),
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Land rejected successfully",
        "status": land.status,
        "reason": land.rejection_reason
    }

# ==========================
# Admin Delete Land
# ==========================

@router.delete("/lands/{land_id}")
def delete_land_admin(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land_title = land.title

    create_activity_log(
        db=db,
        user_id=admin,
        action="ADMIN_DELETE_LAND",
        description=f'Admin deleted land "{land_title}"',
        target_type="LAND",
        target_id=land_id,
    )

    db.delete(land)

    db.commit()

    return {
        "message": "Land deleted successfully"
    }

# ==========================
# Admin Update Land
# ==========================

@router.put("/lands/{land_id}")
def update_land_admin(
    land_id: int,
    updated_land: LandUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    updates = updated_land.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(land, key, value)

    create_activity_log(
        db=db,
        user_id=admin,
        action="ADMIN_UPDATE_LAND",
        description=f'Admin updated land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()
    db.refresh(land)

    return {
        "message": "Land updated successfully",
        "land": {
            "id": land.id,
            "title": land.title,
            "price": land.price,
            "village": land.village
        }
    }
@router.get("/lands/{land_id}")
def get_land_by_id(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    owner = (
        db.query(User)
        .filter(User.id == land.owner_id)
        .first()
    )

    return {
        "id": land.id,
        "title": land.title,
        "description": land.description,
        "price": land.price,
        "area": land.area,
        "village": land.village,
        "mandal": land.mandal,
        "district": land.district,
        "state": land.state,
        "pincode": land.pincode,
        "survey_number": land.survey_number,
        "soil_type": land.soil_type,
        "water_source": land.water_source,
        "crop_type": land.crop_type,
        "latitude": land.latitude,
        "longitude": land.longitude,
        "status": land.status,
        "rejection_reason": land.rejection_reason,

        "image_url": land.image_url,

        "images": [
            {
                "id": image.id,
                "image_url": image.image_url
            }
            for image in land.images
        ],

        "owner_id": land.owner_id,
        "owner_name": owner.full_name if owner else "Unknown",
        "owner_email": owner.email if owner else "",
        "owner_mobile": owner.mobile if owner else "",
    }
# ==========================
# Admin Update User
# ==========================
# =========================================================
# Admin Update User
# =========================================================

@router.put("/users/{user_id}")
def update_user_admin(
    user_id: int,
    updated_user: UserUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    # -----------------------------------------------------
    # Find target user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # -----------------------------------------------------
    # Prevent admin from modifying their own role
    # -----------------------------------------------------

    if user.id == admin:
        requested_role = (
            updated_user.role.lower()
            if updated_user.role
            else user.role
        )

        if requested_role != user.role:
            raise HTTPException(
                status_code=400,
                detail="You cannot change your own admin role"
            )

    # -----------------------------------------------------
    # Validate role
    # -----------------------------------------------------

    if updated_user.role:
        requested_role = (
            updated_user.role
            .strip()
            .lower()
        )

        if requested_role not in [
            "admin",
            "farmer",
            "buyer"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Invalid user role"
            )

        updated_user.role = requested_role

    # -----------------------------------------------------
    # Save old values for activity log
    # -----------------------------------------------------

    old_full_name = user.full_name
    old_email = user.email
    old_mobile = user.mobile
    old_role = user.role

    # -----------------------------------------------------
    # Apply updates
    # -----------------------------------------------------

    updates = updated_user.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(user, key, value)

    # -----------------------------------------------------
    # Determine what changed
    # -----------------------------------------------------

    changes = []

    if old_full_name != user.full_name:
        changes.append("full name")

    if old_email != user.email:
        changes.append("email")

    if old_mobile != user.mobile:
        changes.append("mobile number")

    if old_role != user.role:
        changes.append(
            f"role ({old_role} → {user.role})"
        )

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    if changes:
        description = (
            f'Updated user "{user.full_name}": '
            + ", ".join(changes)
            + "."
        )
    else:
        description = (
            f'Updated user "{user.full_name}".'
        )

    create_activity_log(
        db=db,
        user_id=admin,
        action="UPDATE_USER",
        description=description,
        target_type="USER",
        target_id=user.id
    )

    # -----------------------------------------------------
    # Commit
    # -----------------------------------------------------

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role
        }
    }

# ==========================
# Admin Delete User
# ==========================
# =========================================================
# Delete User
# =========================================================
# =========================================================
# DELETE USER
# =========================================================

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    try:
        # -------------------------------------------------
        # Find target user
        # -------------------------------------------------

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # -------------------------------------------------
        # Prevent deleting yourself
        # -------------------------------------------------

        if user.id == admin:
            raise HTTPException(
                status_code=400,
                detail="You cannot delete your own admin account"
            )

        # -------------------------------------------------
        # Prevent deleting another admin
        # -------------------------------------------------

        if user.role == "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin accounts cannot be deleted"
            )

        # -------------------------------------------------
        # Save information before deletion
        # -------------------------------------------------

        deleted_user_name = user.full_name
        deleted_user_email = user.email
        deleted_user_role = user.role

        # -------------------------------------------------
        # Find user's lands
        # -------------------------------------------------

        user_lands = (
            db.query(Land)
            .filter(
                Land.owner_id == user.id
            )
            .all()
        )

        land_ids = [
            land.id
            for land in user_lands
        ]

        # -------------------------------------------------
        # Find conversations involving this user
        #
        # Also include conversations belonging to
        # the user's lands.
        # -------------------------------------------------

        conversation_query = (
            db.query(Conversation)
            .filter(
                or_(
                    Conversation.buyer_id == user.id,
                    Conversation.farmer_id == user.id,
                    Conversation.land_id.in_(land_ids)
                    if land_ids
                    else False
                )
            )
        )

        conversations = conversation_query.all()

        conversation_ids = [
            conversation.id
            for conversation in conversations
        ]

        # -------------------------------------------------
        # Delete messages belonging to conversations
        # -------------------------------------------------

        if conversation_ids:
            db.query(Message).filter(
                Message.conversation_id.in_(
                    conversation_ids
                )
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete conversations
        # -------------------------------------------------

        if conversation_ids:
            db.query(Conversation).filter(
                Conversation.id.in_(
                    conversation_ids
                )
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete land images
        # -------------------------------------------------

        if land_ids:
            db.query(LandImage).filter(
                LandImage.land_id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete favorites
        #
        # 1. Favorites created by this user
        # 2. Favorites on lands owned by this user
        # -------------------------------------------------

        db.query(Favorite).filter(
            Favorite.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        if land_ids:
            db.query(Favorite).filter(
                Favorite.land_id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete notifications belonging to user
        # -------------------------------------------------

        db.query(Notification).filter(
            Notification.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        # -------------------------------------------------
        # Delete activity logs belonging to user
        #
        # Important:
        # We should NOT create the DELETE_USER activity log
        # with user_id=user.id because the user itself is
        # about to be deleted.
        # -------------------------------------------------

        db.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        # -------------------------------------------------
        # Create deletion activity log
        # -------------------------------------------------

        activity_log = ActivityLog(
            user_id=admin,
            action="DELETE_USER",
            description=(
                f'Deleted user "{deleted_user_name}" '
                f'({deleted_user_email}) '
                f'with role "{deleted_user_role}".'
            ),
            target_type="USER",
            target_id=user.id
        )

        db.add(activity_log)

        # -------------------------------------------------
        # Delete user's lands
        # -------------------------------------------------

        if land_ids:
            db.query(Land).filter(
                Land.id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Finally delete the user
        # -------------------------------------------------

        db.delete(user)

        # -------------------------------------------------
        # Commit everything as one transaction
        # -------------------------------------------------

        db.commit()

        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "DELETE USER ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete user. All changes were rolled back."
        )

@router.get("/district-analytics")
def district_analytics(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    results = (
        db.query(
            Land.district,
            func.count(Land.id).label("count")
        )
        .filter(Land.status == "approved")
        .group_by(Land.district)
        .order_by(func.count(Land.id).desc())
        .all()
    )

    return [
        {
            "district": district,
            "count": count
        }
        for district, count in results
    ]
@router.get("/monthly-growth")
def monthly_growth(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    results = (
        db.query(
            extract("year", User.created_at).label("year"),
            extract("month", User.created_at).label("month"),
            func.count(User.id).label("users")
        )
        .group_by(
            extract("year", User.created_at),
            extract("month", User.created_at)
        )
        .order_by(
            extract("year", User.created_at),
            extract("month", User.created_at)
        )
        .all()
    )

    months = [
        "",
        "Jan", "Feb", "Mar", "Apr",
        "May", "Jun", "Jul", "Aug",
        "Sep", "Oct", "Nov", "Dec"
    ]

    return [
        {
            "month": f"{months[int(month)]} {int(year)}",
            "users": users
        }
        for year, month, users in results
        if year is not None and month is not None
    ]
