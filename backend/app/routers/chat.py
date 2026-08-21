from sqlalchemy import or_, desc
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.auth import get_current_user
from app.models import (
    Conversation,
    Land,
    Message,
    User,
    Notification
)
from app.schemas import ConversationCreate, MessageCreate


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


# ==========================
# Start Chat
# ==========================

@router.post("/start")
def start_chat(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Get current user
    buyer = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Only buyers can start marketplace chats
    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can start a chat"
        )

    # Only approved lands can be contacted
    land = (
        db.query(Land)
        .filter(
            Land.id == data.land_id,
            Land.status == "approved"
        )
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Approved land not found"
        )

    # Prevent chatting with own land
    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot chat with yourself."
        )

    # Check existing conversation
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.land_id == land.id,
            Conversation.buyer_id == current_user,
            Conversation.farmer_id == land.owner_id
        )
        .first()
    )

    if conversation:
        return {
            "conversation_id": conversation.id,
            "message": "Conversation already exists"
        }

    # Create conversation
    conversation = Conversation(
        buyer_id=current_user,
        farmer_id=land.owner_id,
        land_id=land.id
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # Create notification for farmer
    notification = Notification(
        user_id=land.owner_id,
        title="💬 New Chat",
        message=(
            f"{buyer.full_name} started a conversation "
            f"about your land '{land.title}'."
        )
    )

    db.add(notification)
    db.commit()

    return {
        "conversation_id": conversation.id,
        "message": "Conversation created successfully"
    }


# ==========================
# Send Message
# ==========================

@router.post("/send")
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == data.conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # Only conversation participants can send messages
    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    # Prevent empty messages
    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    # Save message
    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,
        message=data.message.strip()
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Get sender details
    sender = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    # Decide receiver
    if current_user == conversation.buyer_id:
        receiver_id = conversation.farmer_id
    else:
        receiver_id = conversation.buyer_id

    # Create notification
    notification = Notification(
        user_id=receiver_id,
        title="💬 New Message",
        message=(
            f"{sender.full_name if sender else 'User'} "
            "sent you a new message."
        )
    )

    db.add(notification)
    db.commit()

    return {
        "message": "Message sent successfully",
        "message_id": message.id
    }


# ==========================
# Get Messages
# ==========================

@router.get("/messages/{conversation_id}")
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # Only participants can read messages
    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    return messages


# ==========================
# My Conversations
# ==========================

@router.get("/my-conversations")
def my_conversations(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversations = (
        db.query(Conversation)
        .filter(
            or_(
                Conversation.buyer_id == current_user,
                Conversation.farmer_id == current_user
            )
        )
        .order_by(desc(Conversation.id))
        .all()
    )

    result = []

    for conversation in conversations:

        if conversation.buyer_id == current_user:
            other_user = (
                db.query(User)
                .filter(
                    User.id == conversation.farmer_id
                )
                .first()
            )
        else:
            other_user = (
                db.query(User)
                .filter(
                    User.id == conversation.buyer_id
                )
                .first()
            )

        land = (
            db.query(Land)
            .filter(
                Land.id == conversation.land_id
            )
            .first()
        )

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation.id
            )
            .order_by(Message.created_at.desc())
            .first()
        )

        result.append({
            "conversation_id": conversation.id,
            "land_title": land.title if land else "",
            "other_user": (
                other_user.full_name
                if other_user
                else ""
            ),
            "last_message": (
                last_message.message
                if last_message
                else ""
            ),
            "last_message_time": (
                last_message.created_at
                if last_message
                else None
            )
        })
# ==========================
# Update Online Presence
# ==========================

@router.post("/presence")
def update_presence(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.last_seen = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Presence updated",
        "last_seen": user.last_seen
    }


# ==========================
# Get User Online Status
# ==========================

@router.get("/presence/{user_id}")
def get_presence(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Verify requested user exists
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

    now = datetime.now(timezone.utc)

    online = False

    if user.last_seen:
        last_seen = user.last_seen

        # Handle databases returning a naive datetime
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(
                tzinfo=timezone.utc
            )

        seconds_since_seen = (
            now - last_seen
        ).total_seconds()

        # Consider user online for 60 seconds
        if seconds_since_seen <= 60:
            online = True

    return {
        "user_id": user.id,
        "online": online,
        "last_seen": user.last_seen
    }

    return result