from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.async_db import async_engine
from app.auth.deps import get_current_user
from app.models import User, Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])

# =====================================================
# SCHEMAS
# =====================================================

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: Optional[str]
    icon: str
    color: str
    link: Optional[str]
    target_type: Optional[str]
    target_id: Optional[int]
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]

class NotificationCountResponse(BaseModel):
    total: int
    unread: int

class MarkReadRequest(BaseModel):
    notification_ids: List[int]

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

async def create_notification(
    session: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    message: Optional[str] = None,
    icon: str = "bell",
    color: str = "#6366f1",
    link: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None
) -> Notification:
    """Helper pour créer une notification"""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        icon=icon,
        color=color,
        link=link,
        target_type=target_type,
        target_id=target_id
    )
    session.add(notification)
    # Ne pas commit ici, laisser l'appelant gérer le commit
    return notification

# =====================================================
# ROUTES
# =====================================================

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer les notifications de l'utilisateur"""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await session.exec(query)
    notifications = result.all()
    
    return [NotificationResponse(
        id=n.id,
        type=n.type,
        title=n.title,
        message=n.message,
        icon=n.icon,
        color=n.color,
        link=n.link,
        target_type=n.target_type,
        target_id=n.target_id,
        is_read=n.is_read,
        created_at=n.created_at,
        read_at=n.read_at
    ) for n in notifications]

@router.get("/count", response_model=NotificationCountResponse)
async def get_notification_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer le nombre de notifications"""
    total_result = await session.exec(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id)
    )
    total = total_result.first() or 0
    
    unread_result = await session.exec(
        select(func.count()).select_from(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    )
    unread = unread_result.first() or 0
    
    return NotificationCountResponse(total=total, unread=unread)

@router.post("/mark-read")
async def mark_notifications_read(
    payload: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Marquer des notifications comme lues"""
    for notif_id in payload.notification_ids:
        result = await session.exec(
            select(Notification)
            .where(Notification.id == notif_id)
            .where(Notification.user_id == current_user.id)
        )
        notification = result.first()
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            session.add(notification)
    
    await session.commit()
    return {"ok": True, "marked": len(payload.notification_ids)}

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Marquer toutes les notifications comme lues"""
    result = await session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    )
    notifications = result.all()
    
    count = 0
    for notification in notifications:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        session.add(notification)
        count += 1
    
    await session.commit()
    return {"ok": True, "marked": count}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer une notification"""
    result = await session.exec(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == current_user.id)
    )
    notification = result.first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    await session.delete(notification)
    await session.commit()
    
    return {"ok": True}

@router.delete("")
async def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer toutes les notifications de l'utilisateur"""
    result = await session.exec(
        select(Notification).where(Notification.user_id == current_user.id)
    )
    notifications = result.all()
    
    count = 0
    for notification in notifications:
        await session.delete(notification)
        count += 1
    
    await session.commit()
    return {"ok": True, "deleted": count}
