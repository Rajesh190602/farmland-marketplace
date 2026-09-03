from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Land, SiteVisit, UserReview


router = APIRouter(
    prefix="/reviews",
    tags=["Reviews & Ratings"],
)


class ReviewCreate(BaseModel):
    reviewed_user_id: int = Field(..., gt=0)
    land_id: int = Field(..., gt=0)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)


class ReviewResponse(BaseModel):
    id: int
    reviewer_id: int
    reviewer_name: str
    reviewer_role: str
    reviewed_user_id: int
    reviewed_user_name: str
    reviewed_user_role: str
    land_id: int
    land_title: str
    rating: int
    comment: Optional[str]
    status: str
    created_at: datetime


class ReviewSummaryResponse(BaseModel):
    user_id: int
    average_rating: float
    total_reviews: int


def _review_to_dict(review: UserReview) -> dict:
    return {
        "id": review.id,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": review.reviewer.full_name,
        "reviewer_role": review.reviewer.role,
        "reviewed_user_id": review.reviewed_user_id,
        "reviewed_user_name": review.reviewed_user.full_name,
        "reviewed_user_role": review.reviewed_user.role,
        "land_id": review.land_id,
        "land_title": review.land.title,
        "rating": review.rating,
        "comment": review.comment,
        "status": review.status,
        "created_at": review.created_at,
    }


@router.post("", response_model=ReviewResponse, status_code=201)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Submit a rating/review after a completed site visit with the other user."""

    if current_user == payload.reviewed_user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot review yourself.",
        )

    reviewed_user = (
        db.query(User)
        .filter(User.id == payload.reviewed_user_id)
        .first()
    )
    if not reviewed_user:
        raise HTTPException(status_code=404, detail="Reviewed user not found.")

    land = db.query(Land).filter(Land.id == payload.land_id).first()
    if not land:
        raise HTTPException(status_code=404, detail="Land listing not found.")

    # A review is allowed only between the buyer and farmer involved in
    # a completed site visit for this land.
    completed_visit = (
        db.query(SiteVisit)
        .join(Land, SiteVisit.land_id == Land.id)
        .filter(
            SiteVisit.land_id == payload.land_id,
            SiteVisit.status == "completed",
            SiteVisit.buyer_id == current_user,
            Land.owner_id == payload.reviewed_user_id,
        )
        .first()
    )

    reverse_completed_visit = (
        db.query(SiteVisit)
        .join(Land, SiteVisit.land_id == Land.id)
        .filter(
            SiteVisit.land_id == payload.land_id,
            SiteVisit.status == "completed",
            SiteVisit.buyer_id == payload.reviewed_user_id,
            Land.owner_id == current_user,
        )
        .first()
    )

    if not completed_visit and not reverse_completed_visit:
        raise HTTPException(
            status_code=403,
            detail="You can review this user only after a completed site visit for this land.",
        )

    existing_review = (
        db.query(UserReview)
        .filter(
            UserReview.reviewer_id == current_user,
            UserReview.reviewed_user_id == payload.reviewed_user_id,
            UserReview.land_id == payload.land_id,
        )
        .first()
    )
    if existing_review:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this user for this land.",
        )

    comment = payload.comment.strip() if payload.comment else None
    if comment == "":
        comment = None

    review = UserReview(
        reviewer_id=current_user,
        reviewed_user_id=payload.reviewed_user_id,
        land_id=payload.land_id,
        rating=payload.rating,
        comment=comment,
        status="published",
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return _review_to_dict(review)


@router.get("/user/{user_id}", response_model=list[ReviewResponse])
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return published reviews received by a user."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    reviews = (
        db.query(UserReview)
        .filter(
            UserReview.reviewed_user_id == user_id,
            UserReview.status == "published",
        )
        .order_by(UserReview.created_at.desc())
        .all()
    )

    return [_review_to_dict(review) for review in reviews]


@router.get("/user/{user_id}/summary", response_model=ReviewSummaryResponse)
def get_user_rating_summary(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return average rating and published review count for a user."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    result = (
        db.query(
            func.coalesce(func.avg(UserReview.rating), 0.0),
            func.count(UserReview.id),
        )
        .filter(
            UserReview.reviewed_user_id == user_id,
            UserReview.status == "published",
        )
        .one()
    )

    average_rating = round(float(result[0] or 0.0), 2)
    total_reviews = int(result[1] or 0)

    return {
        "user_id": user_id,
        "average_rating": average_rating,
        "total_reviews": total_reviews,
    }


@router.get("/me/written", response_model=list[ReviewResponse])
def get_my_written_reviews(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return reviews submitted by the logged-in user."""

    reviews = (
        db.query(UserReview)
        .filter(UserReview.reviewer_id == current_user)
        .order_by(UserReview.created_at.desc())
        .all()
    )

    return [_review_to_dict(review) for review in reviews]


@router.get("/me/received", response_model=list[ReviewResponse])
def get_my_received_reviews(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return published reviews received by the logged-in user."""

    reviews = (
        db.query(UserReview)
        .filter(
            UserReview.reviewed_user_id == current_user,
            UserReview.status == "published",
        )
        .order_by(UserReview.created_at.desc())
        .all()
    )

    return [_review_to_dict(review) for review in reviews]


@router.get("/eligibility")
def get_review_eligibility(
    land_id: int = Query(..., gt=0),
    reviewed_user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Check whether the logged-in user can review another user for a land listing."""

    if current_user == reviewed_user_id:
        return {"eligible": False, "reason": "You cannot review yourself."}

    land = db.query(Land).filter(Land.id == land_id).first()
    if not land:
        raise HTTPException(status_code=404, detail="Land listing not found.")

    reviewed_user = db.query(User).filter(User.id == reviewed_user_id).first()
    if not reviewed_user:
        raise HTTPException(status_code=404, detail="Reviewed user not found.")

    existing_review = (
        db.query(UserReview)
        .filter(
            UserReview.reviewer_id == current_user,
            UserReview.reviewed_user_id == reviewed_user_id,
            UserReview.land_id == land_id,
        )
        .first()
    )
    if existing_review:
        return {
            "eligible": False,
            "reason": "You have already reviewed this user for this land.",
            "review_id": existing_review.id,
        }

    eligible_visit = (
        db.query(SiteVisit)
        .join(Land, SiteVisit.land_id == Land.id)
        .filter(
            SiteVisit.land_id == land_id,
            SiteVisit.status == "completed",
            SiteVisit.buyer_id == current_user,
            Land.owner_id == reviewed_user_id,
        )
        .first()
    )

    reverse_eligible_visit = (
        db.query(SiteVisit)
        .join(Land, SiteVisit.land_id == Land.id)
        .filter(
            SiteVisit.land_id == land_id,
            SiteVisit.status == "completed",
            SiteVisit.buyer_id == reviewed_user_id,
            Land.owner_id == current_user,
        )
        .first()
    )

    eligible = bool(eligible_visit or reverse_eligible_visit)

    return {
        "eligible": eligible,
        "reason": (
            None
            if eligible
            else "A completed site visit between both users for this land is required."
        ),
    }
