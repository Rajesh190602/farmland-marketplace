from sqlalchemy import or_, desc
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form
)
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

from app.schemas import (
    ConversationCreate,
    MessageCreate
)


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


# =========================================================
# START CHAT
# =========================================================

@router.post("/start")
def start_chat(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Get current user
    # ----------------------------------

    buyer = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Only buyers can start marketplace chats
    # ----------------------------------

    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can start a chat"
        )

    # ----------------------------------
    # Only approved lands can be contacted
    # ----------------------------------

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

    # ----------------------------------
    # Prevent chatting with own land
    # ----------------------------------

    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot chat with yourself."
        )

    # ----------------------------------
    # Check existing conversation
    # ----------------------------------

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

    # ----------------------------------
    # Create conversation
    # ----------------------------------

    conversation = Conversation(
        buyer_id=current_user,
        farmer_id=land.owner_id,
        land_id=land.id
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # ----------------------------------
    # Notification for farmer
    # ----------------------------------

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


# =========================================================
# SEND TEXT MESSAGE
# =========================================================

@router.post("/send")
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Find conversation
    # ----------------------------------

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

    # ----------------------------------
    # Only participants can send
    # ----------------------------------

    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    # ----------------------------------
    # Prevent empty messages
    # ----------------------------------

    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    # ----------------------------------
    # Create message
    # ----------------------------------

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,
        message=data.message.strip()
    )

    db.add(message)
    db.commit()
    db.refresh(message)

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
    # Determine receiver
    # ----------------------------------

    if current_user == conversation.buyer_id:
        receiver_id = conversation.farmer_id
    else:
        receiver_id = conversation.buyer_id

    # ----------------------------------
    # Notification
    # ----------------------------------

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


# =========================================================
# SEND CHAT FILE / IMAGE
# =========================================================

@router.post("/send-file")
async def send_chat_file(
    conversation_id: int = Form(...),
    file: UploadFile = File(...),
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
    # Only participants can send files
    # ----------------------------------

    if current_user not in [
        conversation.buyer_id,
        conversation.farmer_id
    ]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    # ----------------------------------
    # Validate filename
    # ----------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )

    # ----------------------------------
    # Allowed file types
    # ----------------------------------

    allowed_types = {
        "image/jpeg": "image",
        "image/png": "image",
        "image/webp": "image",

        "application/pdf": "file",

        "application/msword": "file",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            "file",

        "application/vnd.ms-excel":
            "file",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            "file"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type not supported: "
                f"{file.content_type}"
            )
        )

    message_type = allowed_types[
        file.content_type
    ]

    # ----------------------------------
    # Maximum 10 MB
    # ----------------------------------

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

        file_url = upload_result.get(
            "secure_url"
        )

        if not file_url:
            raise Exception(
                "Cloudinary did not return secure_url"
            )

    except Exception as cloudinary_error:

        import traceback

        print("=" * 50)
        print("CLOUDINARY UPLOAD ERROR")
        print(
            "ERROR:",
            str(cloudinary_error)
        )
        traceback.print_exc()
        print("=" * 50)

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
    # Create file message
    # ----------------------------------

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,

        # Important:
        # File messages don't contain text.
        # This requires Message.message to allow NULL.
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

        print("=" * 50)
        print("DATABASE ERROR WHILE SAVING CHAT FILE")
        print(
            "ERROR:",
            str(database_error)
        )
        traceback.print_exc()
        print("=" * 50)

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
    # Notification
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


# =========================================================
# DELETE MESSAGE
# =========================================================

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
            detail=(
                "You can delete only your own messages"
            )
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


# =========================================================
# GET MESSAGES
# =========================================================
#
# IMPORTANT:
# There must be ONLY ONE endpoint with this path.
#
# When a user opens the conversation, all messages
# received from the other participant are marked READ.
#
# This produces:
#
# ✓   = sent but not seen
# ✓✓  = seen by receiver
#
# =========================================================

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
    # Verify participant
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
    # Mark messages from OTHER USER
    # as READ
    # ----------------------------------

    db.query(Message).filter(
        Message.conversation_id ==
        conversation_id,

        Message.sender_id !=
        current_user,

        Message.is_read == False
    ).update(
        {
            Message.is_read: True
        },
        synchronize_session=False
    )

    db.commit()

    # ----------------------------------
    # Get messages
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


# =========================================================
# MY CONVERSATIONS
# =========================================================

@router.get("/my-conversations")
def my_conversations(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversations = (
        db.query(Conversation)
        .filter(
            or_(
                Conversation.buyer_id ==
                current_user,

                Conversation.farmer_id ==
                current_user
            )
        )
        .order_by(
            desc(Conversation.id)
        )
        .all()
    )

    result = []

    for conversation in conversations:

        # ----------------------------------
        # Find other user
        # ----------------------------------

        if conversation.buyer_id == current_user:

            other_user = (
                db.query(User)
                .filter(
                    User.id ==
                    conversation.farmer_id
                )
                .first()
            )

        else:

            other_user = (
                db.query(User)
                .filter(
                    User.id ==
                    conversation.buyer_id
                )
                .first()
            )

        # ----------------------------------
        # Find land
        # ----------------------------------

        land = (
            db.query(Land)
            .filter(
                Land.id ==
                conversation.land_id
            )
            .first()
        )

        # ----------------------------------
        # Find last message
        # ----------------------------------

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id ==
                conversation.id
            )
            .order_by(
                Message.created_at.desc()
            )
            .first()
        )

        result.append(
            {
                "conversation_id":
                    conversation.id,

                "land_title":
                    land.title
                    if land
                    else "",

                "other_user":
                    other_user.full_name
                    if other_user
                    else "",

                "last_message":
                    last_message.message
                    if last_message
                    and last_message.message
                    else (
                        "📎 File"
                        if last_message
                        and last_message.file_url
                        else ""
                    ),

                "last_message_time":
                    last_message.created_at
                    if last_message
                    else None
            }
        )

    return result


# =========================================================
# UPDATE ONLINE PRESENCE
# =========================================================

@router.post("/presence")
def update_presence(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    user = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.last_seen = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(user)

    return {
        "message": "Presence updated",
        "last_seen": user.last_seen
    }


# =========================================================
# GET USER ONLINE STATUS
# =========================================================

@router.get("/presence/{user_id}")
def get_presence(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Find requested user
    # ----------------------------------

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    now = datetime.now(
        timezone.utc
    )

    online = False

    # ----------------------------------
    # Check last seen
    # ----------------------------------

    if user.last_seen:

        last_seen = user.last_seen

        # Handle naive database datetime
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(
                tzinfo=timezone.utc
            )

        seconds_since_seen = (
            now - last_seen
        ).total_seconds()

        # Consider online for 60 seconds
        if seconds_since_seen <= 60:
            online = True

    return {
        "user_id": user.id,
        "online": online,
        "last_seen": user.last_seen
    }