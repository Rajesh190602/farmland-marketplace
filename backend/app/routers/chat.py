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
import os
import io
import zipfile

import cloudinary
import cloudinary.uploader

from app.database import get_db
from app.auth import get_current_user

from app.models import (
    Conversation,
    Land,
    Message,
    User,
    Notification,
    ActivityLog,
    UserBlock,
    ConversationMute,
    ConversationArchive,
    ConversationDeletion
)

from app.schemas import (
    ConversationCreate,
    MessageCreate,
    FarmerReplyConversationCreate
)


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


# =========================================================
# PHASE 4 - CONVERSATION MUTE
# =========================================================

def is_conversation_muted(
    db: Session,
    conversation_id: int,
    user_id: int
):
    return (
        db.query(ConversationMute)
        .filter(
            ConversationMute.conversation_id == conversation_id,
            ConversationMute.user_id == user_id
        )
        .first()
        is not None
    )


@router.get("/mute/{conversation_id}")
def get_mute_status(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(404, "Conversation not found")

    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(403, "You are not part of this conversation")

    return {
        "conversation_id": conversation_id,
        "muted": is_conversation_muted(db, conversation_id, current_user)
    }


@router.post("/mute/{conversation_id}")
def mute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(404, "Conversation not found")

    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(403, "You are not part of this conversation")

    existing_mute = (
        db.query(ConversationMute)
        .filter(
            ConversationMute.conversation_id == conversation_id,
            ConversationMute.user_id == current_user
        )
        .first()
    )

    if existing_mute:
        return {
            "message": "Conversation is already muted.",
            "conversation_id": conversation_id,
            "muted": True
        }

    db.add(ConversationMute(
        conversation_id=conversation_id,
        user_id=current_user
    ))
    db.commit()

    return {
        "message": "Conversation muted successfully.",
        "conversation_id": conversation_id,
        "muted": True
    }


@router.delete("/mute/{conversation_id}")
def unmute_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(404, "Conversation not found")

    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(403, "You are not part of this conversation")

    existing_mute = (
        db.query(ConversationMute)
        .filter(
            ConversationMute.conversation_id == conversation_id,
            ConversationMute.user_id == current_user
        )
        .first()
    )

    if not existing_mute:
        return {
            "message": "Conversation is already unmuted.",
            "conversation_id": conversation_id,
            "muted": False
        }

    db.delete(existing_mute)
    db.commit()

    return {
        "message": "Conversation unmuted successfully.",
        "conversation_id": conversation_id,
        "muted": False
    }


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
        existing_deletion = db.query(ConversationDeletion).filter(
            ConversationDeletion.conversation_id == conversation.id,
            ConversationDeletion.user_id == current_user
        ).first()

        if existing_deletion:
            db.delete(existing_deletion)
            existing_archive = db.query(ConversationArchive).filter(
                ConversationArchive.conversation_id == conversation.id,
                ConversationArchive.user_id == current_user
            ).first()
            if existing_archive:
                db.delete(existing_archive)
            db.commit()
            return {
                "conversation_id": conversation.id,
                "message": "Conversation restored because you started chatting again"
            }

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
    # SECURITY ACTIVITY LOG
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_STARTED",
        description=(
            f"Started a conversation with farmer "
            f"user {land.owner_id} about land "
            f"'{land.title}'."
        ),
        target_type="conversation",
        target_id=conversation.id
    )

    db.add(activity_log)
    db.commit()

    # ----------------------------------
    # Notification for farmer
    # ----------------------------------

    notification = Notification(
    user_id=land.owner_id,
    title="💬 New Chat",
    message=(
        f"{buyer.full_name} started a conversation "
        f"about your land '{land.title}'."
    ),
    target_type="conversation",
    target_id=conversation.id
)

    db.add(notification)
    db.commit()

    return {
        "conversation_id": conversation.id,
        "message": "Conversation created successfully"
    }

# =========================================================
# FARMER REPLY TO BUYER
# =========================================================

@router.post("/reply")
def reply_to_buyer(
    data: FarmerReplyConversationCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Get current user
    # ----------------------------------

    farmer = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Only farmers can use this endpoint
    # ----------------------------------

    if farmer.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can reply to buyers"
        )

    # ----------------------------------
    # Get land
    # ----------------------------------

    land = (
        db.query(Land)
        .filter(
            Land.id == data.land_id,
            Land.owner_id == current_user
        )
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found or you are not the owner"
        )

    
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.land_id == land.id,
            Conversation.buyer_id == data.buyer_id,
            Conversation.farmer_id == current_user
        )
        .first()
    )

    # ----------------------------------
    # If conversation exists
    # ----------------------------------

    if conversation:
        return {
            "conversation_id": conversation.id,
            "message": "Conversation already exists"
        }

    # ----------------------------------
    # Verify buyer
    # ----------------------------------

    buyer = (
        db.query(User)
        .filter(
            User.id == data.buyer_id,
            User.role == "buyer"
        )
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="Buyer not found"
        )

    # ----------------------------------
    # Create conversation
    # ----------------------------------

    conversation = Conversation(
        buyer_id=buyer.id,
        farmer_id=current_user,
        land_id=land.id
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # ----------------------------------
    # Notify buyer
    # ----------------------------------

    notification = Notification(
        user_id=buyer.id,
        title="💬 New Message",
        message=(
            f"{farmer.full_name} started a conversation "
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

    verify_conversation_not_deleted(
        db,
        data.conversation_id,
        current_user
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
    # SECURITY ACTIVITY LOG
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_MESSAGE_SENT",
        description=(
            f"Sent a message in conversation "
            f"{conversation.id}."
        ),
        target_type="conversation",
        target_id=conversation.id
    )

    db.add(activity_log)
    db.commit()

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
    # Respect the receiver's mute setting.
    # Muting suppresses notifications only; messages still work.
    # ----------------------------------

    if not is_conversation_muted(db, conversation.id, receiver_id):
        notification = Notification(
            user_id=receiver_id,
            title="💬 New Message",
            message=(
                f"{sender.full_name if sender else 'User'} "
                "sent you a new message."
            ),
            target_type="conversation",
            target_id=conversation.id
        )

        db.add(notification)
        db.commit()

    return {
        "message": "Message sent successfully",
        "message_id": message.id
    }


# =========================================================
# CHAT FILE VALIDATION
# =========================================================

CHAT_FILE_RULES = {
    ".jpg": {"mime": "image/jpeg", "type": "image"},
    ".jpeg": {"mime": "image/jpeg", "type": "image"},
    ".png": {"mime": "image/png", "type": "image"},
    ".webp": {"mime": "image/webp", "type": "image"},
    ".pdf": {"mime": "application/pdf", "type": "file"},
    ".doc": {"mime": "application/msword", "type": "file"},
    ".docx": {
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "type": "file",
    },
    ".xls": {"mime": "application/vnd.ms-excel", "type": "file"},
    ".xlsx": {
        "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "type": "file",
    },
}

MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024
MAX_CHAT_FILENAME_LENGTH = 255


def _has_prefix(content: bytes, prefix: bytes) -> bool:
    return content.startswith(prefix)


def _validate_file_signature(
    filename: str,
    content_type: str,
    file_content: bytes,
) -> None:
    """Validate the actual file bytes instead of trusting the browser MIME type."""

    extension = os.path.splitext(filename)[1].lower()

    if content_type in {"image/jpeg"}:
        valid = _has_prefix(file_content, b"\xff\xd8\xff")
    elif content_type == "image/png":
        valid = _has_prefix(file_content, b"\x89PNG\r\n\x1a\n")
    elif content_type == "image/webp":
        valid = (
            len(file_content) >= 12
            and file_content[:4] == b"RIFF"
            and file_content[8:12] == b"WEBP"
        )
    elif content_type == "application/pdf":
        valid = _has_prefix(file_content, b"%PDF-")
    elif content_type in {"application/msword", "application/vnd.ms-excel"}:
        # Legacy .doc/.xls files use the OLE Compound File signature.
        valid = _has_prefix(
            file_content,
            b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",
        )
    elif content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }:
        # DOCX/XLSX are ZIP containers. Also verify the expected internal file.
        valid = False
        if _has_prefix(file_content, b"PK\x03\x04"):
            try:
                with zipfile.ZipFile(io.BytesIO(file_content)) as archive:
                    names = set(archive.namelist())
                    if content_type.endswith("wordprocessingml.document"):
                        valid = (
                            "[Content_Types].xml" in names
                            and "word/document.xml" in names
                        )
                    else:
                        valid = (
                            "[Content_Types].xml" in names
                            and "xl/workbook.xml" in names
                        )
            except (zipfile.BadZipFile, OSError):
                valid = False
    else:
        valid = False

    if not valid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"The selected {extension or 'file'} is invalid or corrupted. "
                "Please choose a genuine supported file."
            ),
        )


def validate_chat_file(
    filename: str,
    browser_content_type: str | None,
    file_content: bytes,
):
    if not filename:
        raise HTTPException(status_code=400, detail="No file selected")

    if "\x00" in filename or any(ord(char) < 32 for char in filename):
        raise HTTPException(status_code=400, detail="Invalid file name")

    safe_filename = os.path.basename(filename.replace("\\", "/"))
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid file name")

    if len(safe_filename) > MAX_CHAT_FILENAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="File name must be 255 characters or less",
        )

    extension = os.path.splitext(safe_filename)[1].lower()
    rule = CHAT_FILE_RULES.get(extension)

    if not rule:
        allowed = ", ".join(sorted(CHAT_FILE_RULES.keys()))
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed types: {allowed}",
        )

    expected_mime = rule["mime"]
    supplied_mime = (browser_content_type or "").split(";", 1)[0].strip().lower()

    # Browsers can report application/octet-stream or an empty MIME type for
    # some document files. In that case the extension plus byte signature is
    # authoritative. A conflicting specific MIME type is rejected.
    generic_mimes = {"", "application/octet-stream"}
    if supplied_mime not in generic_mimes and supplied_mime != expected_mime:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File extension '{extension}' does not match the selected "
                f"file type. Expected {expected_mime}."
            ),
        )

    if not file_content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(file_content) > MAX_CHAT_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be 10 MB or less",
        )

    _validate_file_signature(safe_filename, expected_mime, file_content)

    return safe_filename, expected_mime, rule["type"]


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
    # Read only up to the allowed size + 1 byte.
    # This prevents unnecessarily loading very large uploads.
    # ----------------------------------

    file_content = await file.read(MAX_CHAT_FILE_SIZE + 1)

    # ----------------------------------
    # Validate filename, extension, MIME, size and
    # actual file signature before sending anything to Cloudinary.
    # ----------------------------------

    safe_filename, canonical_mime, message_type = validate_chat_file(
        file.filename or "",
        file.content_type,
        file_content,
    )

    # ----------------------------------
    # Upload to Cloudinary only after validation
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

        # File messages do not contain text
        message=None,

        message_type=message_type,
        file_url=file_url,
        file_name=safe_filename,
        file_size=len(file_content),
        file_type=canonical_mime
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
    # SECURITY ACTIVITY LOG
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_FILE_SENT",
        description=(
            f"Sent file '{safe_filename}' "
            f"in conversation {conversation.id}."
        ),
        target_type="conversation",
        target_id=conversation.id
    )

    db.add(activity_log)
    db.commit()

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
    # Respect the receiver's mute setting.
    # ----------------------------------

    if not is_conversation_muted(db, conversation.id, receiver_id):
        notification = Notification(
            user_id=receiver_id,
            title="📎 New File",
            message=(
                f"{sender.full_name if sender else 'User'} "
                f"sent you a file: {safe_filename}"
            ),
            target_type="conversation",
            target_id=conversation.id
        )

        db.add(notification)
        db.commit()

    return {
        "message": "File sent successfully",
        "message_id": message.id,
        "file_name": safe_filename,
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
            detail="You can delete only your own messages"
        )

    # ----------------------------------
    # Verify conversation
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
    # Save activity information
    # BEFORE deleting message
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_MESSAGE_DELETED",
        description=(
            f"Deleted message {message.id} "
            f"from conversation "
            f"{conversation.id}."
        ),
        target_type="message",
        target_id=message.id
    )

    # ----------------------------------
    # Delete message
    # ----------------------------------

    db.add(activity_log)
    db.delete(message)
    db.commit()

    return {
        "message": "Message deleted successfully",
        "message_id": message_id
    }


# =========================================================
# GET MESSAGES
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

    verify_conversation_not_deleted(
        db,
        conversation_id,
        current_user
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
# PHASE 4 - CONVERSATION ARCHIVE
# Archive is per-user. It never deletes messages.
# =========================================================

def verify_conversation_participant(
    conversation,
    current_user
):
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


@router.post("/archive/{conversation_id}")
def archive_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    verify_conversation_participant(
        conversation,
        current_user
    )

    existing_archive = (
        db.query(ConversationArchive)
        .filter(
            ConversationArchive.conversation_id == conversation_id,
            ConversationArchive.user_id == current_user
        )
        .first()
    )

    if existing_archive:
        return {
            "message": "Conversation is already archived.",
            "conversation_id": conversation_id,
            "archived": True
        }

    archive = ConversationArchive(
        conversation_id=conversation_id,
        user_id=current_user
    )

    db.add(archive)

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_CONVERSATION_ARCHIVED",
        description=(
            f"Archived conversation {conversation_id}."
        ),
        target_type="conversation",
        target_id=conversation_id
    )

    db.add(activity_log)
    db.commit()

    return {
        "message": "Conversation archived successfully.",
        "conversation_id": conversation_id,
        "archived": True
    }


@router.delete("/archive/{conversation_id}")
def restore_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    verify_conversation_participant(
        conversation,
        current_user
    )

    existing_archive = (
        db.query(ConversationArchive)
        .filter(
            ConversationArchive.conversation_id == conversation_id,
            ConversationArchive.user_id == current_user
        )
        .first()
    )

    if not existing_archive:
        return {
            "message": "Conversation is already active.",
            "conversation_id": conversation_id,
            "archived": False
        }

    db.delete(existing_archive)

    activity_log = ActivityLog(
        user_id=current_user,
        action="CHAT_CONVERSATION_RESTORED",
        description=(
            f"Restored conversation {conversation_id}."
        ),
        target_type="conversation",
        target_id=conversation_id
    )

    db.add(activity_log)
    db.commit()

    return {
        "message": "Conversation restored successfully.",
        "conversation_id": conversation_id,
        "archived": False
    }


@router.get("/archive/{conversation_id}")
def get_archive_status(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

    verify_conversation_participant(
        conversation,
        current_user
    )

    archived = (
        db.query(ConversationArchive)
        .filter(
            ConversationArchive.conversation_id == conversation_id,
            ConversationArchive.user_id == current_user
        )
        .first()
        is not None
    )

    return {
        "conversation_id": conversation_id,
        "archived": archived
    }


@router.get("/my-archived-conversations")
def my_archived_conversations(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    archives = (
        db.query(ConversationArchive)
        .filter(
            ConversationArchive.user_id == current_user
        )
        .order_by(
            desc(ConversationArchive.archived_at)
        )
        .all()
    )

    result = []

    for archive in archives:
        conversation = archive.conversation

        if not conversation:
            continue

        deleted_for_user = db.query(ConversationDeletion).filter(
            ConversationDeletion.conversation_id == conversation.id,
            ConversationDeletion.user_id == current_user
        ).first()
        if deleted_for_user:
            continue

        if conversation.buyer_id == current_user:
            other_user = (
                db.query(User)
                .filter(User.id == conversation.farmer_id)
                .first()
            )
        else:
            other_user = (
                db.query(User)
                .filter(User.id == conversation.buyer_id)
                .first()
            )

        land = (
            db.query(Land)
            .filter(Land.id == conversation.land_id)
            .first()
        )

        last_message = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation.id
            )
            .order_by(
                Message.created_at.desc()
            )
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
                if last_message and last_message.message
                else (
                    "📎 File"
                    if last_message and last_message.file_url
                    else ""
                )
            ),
            "last_message_time": (
                last_message.created_at
                if last_message
                else None
            ),
            "archived_at": archive.archived_at
        })

    return result


# =========================================================
# DELETE CONVERSATION FOR ME
# The shared conversation and messages remain for the other participant.
# =========================================================

def verify_conversation_participant(conversation, current_user):
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(status_code=403, detail="You are not part of this conversation")


def verify_conversation_not_deleted(db, conversation_id, current_user):
    deletion = db.query(ConversationDeletion).filter(
        ConversationDeletion.conversation_id == conversation_id,
        ConversationDeletion.user_id == current_user
    ).first()
    if deletion:
        raise HTTPException(status_code=404, detail="This conversation has been deleted for you")


@router.delete("/delete/{conversation_id}")
def delete_conversation_for_me(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    verify_conversation_participant(conversation, current_user)

    existing_deletion = db.query(ConversationDeletion).filter(
        ConversationDeletion.conversation_id == conversation_id,
        ConversationDeletion.user_id == current_user
    ).first()
    if existing_deletion:
        return {"message": "Conversation is already deleted for you.", "conversation_id": conversation_id, "deleted": True}

    db.add(ConversationDeletion(conversation_id=conversation_id, user_id=current_user))

    existing_archive = db.query(ConversationArchive).filter(
        ConversationArchive.conversation_id == conversation_id,
        ConversationArchive.user_id == current_user
    ).first()
    if existing_archive:
        db.delete(existing_archive)

    db.add(ActivityLog(
        user_id=current_user,
        action="CHAT_CONVERSATION_DELETED_FOR_ME",
        description=f"Deleted conversation {conversation_id} for self.",
        target_type="conversation",
        target_id=conversation_id
    ))
    db.commit()
    return {"message": "Conversation deleted for you successfully.", "conversation_id": conversation_id, "deleted": True}


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
        .outerjoin(
            ConversationArchive,
            (
                ConversationArchive.conversation_id ==
                Conversation.id
            )
            &
            (
                ConversationArchive.user_id ==
                current_user
            )
        )
        .outerjoin(
            ConversationDeletion,
            (
                ConversationDeletion.conversation_id ==
                Conversation.id
            )
            &
            (
                ConversationDeletion.user_id ==
                current_user
            )
        )
        .filter(
            or_(
                Conversation.buyer_id ==
                current_user,

                Conversation.farmer_id ==
                current_user
            )
        )
        .filter(
            ConversationArchive.id.is_(None)
        )
        .filter(
            ConversationDeletion.id.is_(None)
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

        # ----------------------------------
        # Count unread messages
        # ----------------------------------
        #
        # Only messages sent by the OTHER participant
        # are unread for the current user.
        #
        # This is intentionally a conversation-level
        # count for the Home dashboard:
        #
        #   0 unread messages -> conversation is not new
        #   1+ unread messages -> conversation is new
        #
        # Therefore, if one conversation has 5 unread
        # messages, Home Chats counts it as 1 unread chat,
        # not 5.
        #
        # The existing /messages/{conversation_id}
        # endpoint continues to mark incoming messages
        # as read when the conversation is opened.
        # ----------------------------------

        unread_count = (
            db.query(Message)
            .filter(
                Message.conversation_id ==
                conversation.id,
                Message.sender_id !=
                current_user,
                Message.is_read == False
            )
            .count()
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
                    else None,

                # Number of unread incoming messages
                # in this conversation.
                "unread_count":
                    unread_count
            }
        )

    return result
# =========================================================
# GET CONVERSATION DETAILS
# =========================================================

@router.get("/conversation/{conversation_id}")
def get_conversation_details(
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
    # Only participants can access
    # ----------------------------------

    if (
        conversation.buyer_id != current_user
        and
        conversation.farmer_id != current_user
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation"
        )

    # ----------------------------------
    # Find the OTHER user
    # ----------------------------------

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

    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="Other user not found"
        )

    # ----------------------------------
    # Find land
    # ----------------------------------

    land = (
        db.query(Land)
        .filter(
            Land.id == conversation.land_id
        )
        .first()
    )

    # ----------------------------------
    # Return details
    # ----------------------------------

    return {
        "conversation_id": conversation.id,
        "other_user_id": other_user.id,
        "other_user_name": other_user.full_name,
        "other_user_role": other_user.role,
        "land_id": conversation.land_id,
        "land_title": (
            land.title
            if land
            else ""
        )
    }
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