from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import Conversation, Land, Message
from app.schemas import ConversationCreate, MessageCreate
from app.database import get_db
from app.auth import get_current_user
from app.models import Conversation, Land
from app.schemas import ConversationCreate

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


@router.post("/start")
def start_chat(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    land = db.query(Land).filter(
        Land.id == data.land_id
    ).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot chat with yourself."
        )

    conversation = db.query(Conversation).filter(
        Conversation.land_id == land.id,
        Conversation.buyer_id == current_user,
        Conversation.farmer_id == land.owner_id
    ).first()

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

    return {
        "conversation_id": conversation.id,
        "message": "Conversation created successfully"
    }
@router.post("/send")
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = db.query(Conversation).filter(
        Conversation.id == data.conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(
            status_code=403,
            detail="You are not part of this conversation"
        )

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user,
        message=data.message
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return {
        "message": "Message sent successfully",
        "message_id": message.id
    }
@router.get("/messages/{conversation_id}")
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    if current_user not in [conversation.buyer_id, conversation.farmer_id]:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return messages