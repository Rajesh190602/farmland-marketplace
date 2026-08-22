from sqlalchemy import or_, desc
from fastapi import APIRouter, Depends, HTTPException,UploadFile,File,Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader
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

    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can start a chat"
        )

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

    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot chat with yourself."
        )

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

    conversation = Conversation(
        buyer_id=current_user,
        farmer_id=land.owner_id,
        land_id=land.id
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

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

    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,
        message=data.message.strip()
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    sender = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if current_user == conversation.buyer_id:
        receiver_id = conversation.farmer_id
    else:
        receiver_id = conversation.buyer_id

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
# Send Chat File / Image
# ==========================

@router.post("/send-file")
async def send_chat_file(
    conversation_id: int = Form(...),
    file: UploadFile = File(...),
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

    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    allowed_types = {
        "image/jpeg": "image",
        "image/png": "image",
        "image/webp": "image",
        "application/pdf": "file",
        "application/msword": "file",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
        "application/vnd.ms-excel": "file",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported: {file.content_type}"
        )

    message_type = allowed_types[file.content_type]

    MAX_FILE_SIZE = 10 * 1024 * 1024

    file_content = await file.read()

    if len(file_content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be 10 MB or less"
        )

    # ----------------------------------
    # Upload to Cloudinary
    # ----------------------------------

    try:
        upload_result = cloudinary.uploader.upload(
            file_content,
            resource_type="auto"
        )

        file_url = upload_result.get("secure_url")

        if not file_url:
            raise Exception(
                "Cloudinary did not return secure_url"
            )

    except Exception as cloudinary_error:

        import traceback

        print("====================================")
        print("CLOUDINARY UPLOAD ERROR")
        print(
            "ERROR:",
            str(cloudinary_error)
        )
        traceback.print_exc()
        print("====================================")

        raise HTTPException(
            status_code=500,
            detail=(
                "Cloudinary upload failed: "
                f"{str(cloudinary_error)}"
            )
        )

    # ----------------------------------
    # Determine receiver
    # ----------------------------------

    if current_user == conversation.buyer_id:
        receiver_id = conversation.farmer_id
    else:
        receiver_id = conversation.buyer_id

    # ----------------------------------
    # Create message
    # ----------------------------------

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,
        message=None,
        message_type=message_type,
        file_url=file_url,
        file_name=file.filename,
        file_size=len(file_content),
        file_type=file.content_type
    )

    try:
        db.add(message)
        db.commit()
        db.refresh(message)

    except Exception as database_error:

        db.rollback()

        import traceback

        print("====================================")
        print("DATABASE ERROR WHILE SAVING CHAT FILE")
        print(
            "ERROR:",
            str(database_error)
        )
        traceback.print_exc()
        print("====================================")

        raise HTTPException(
            status_code=500,
            detail=(
                "Database error: "
                f"{str(database_error)}"
            )
        )

    # ----------------------------------
    # Get sender
    # ----------------------------------

    sender = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    # ----------------------------------
    # Create notification
    # ----------------------------------

    notification = Notification(
        user_id=receiver_id,
        title="📎 New File",
        message=(
            f"{sender.full_name if sender else 'User'} "
            f"sent you a file: {file.filename}"
        )
    )

    db.add(notification)
    db.commit()

    return {
        "message": "File sent successfully",
        "message_id": message.id,
        "file_name": file.filename,
        "file_url": file_url,
        "message_type": message_type
    }
# ==========================
# Delete Message
# ==========================

@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Find message
    # ----------------------------------

    message = (
        db.query(Message)
        .filter(
            Message.id == message_id
        )
        .first()
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found"
        )

    # ----------------------------------
    # Only sender can delete
    # ----------------------------------

    if message.sender_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You can delete only your own messages"
        )

    # ----------------------------------
    # Verify conversation exists
    # ----------------------------------

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id ==
            message.conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    # ----------------------------------
    # Delete message
    # ----------------------------------

    db.delete(message)
    db.commit()

    return {
        "message": "Message deleted successfully",
        "message_id": message_id
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
# Get Messages
# ==========================

@router.get("/messages/{conversation_id}")
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Find conversation
    # ----------------------------------

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

    # ----------------------------------
    # Check participant
    # ----------------------------------

    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    # ----------------------------------
    # Mark messages from the other
    # participant as READ
    # ----------------------------------

    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user,
        Message.is_read == False
    ).update(
        {
            Message.is_read: True
        },
        synchronize_session=False
    )

    db.commit()

    # ----------------------------------
    # Get all messages
    # ----------------------------------

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id ==
            conversation_id
        )
        .order_by(
            Message.created_at.asc()
        )
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

    return result


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
    db.refresh(user)

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

        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(
                tzinfo=timezone.utc
            )

        seconds_since_seen = (
            now - last_seen
        ).total_seconds()

        if seconds_since_seen <= 60:
            online = True

    return {
        "user_id": user.id,
        "online": online,
        "last_seen": user.last_seen
    }