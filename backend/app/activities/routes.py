from fastapi import APIRouter, Depends, Query
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models import Activity, User, Wishlist, WishlistShare, GroupMember
from app.auth.deps import get_current_user
from app.core.async_db import async_engine

router = APIRouter(prefix="/activities", tags=["activities"])

# =====================================================
# SCHEMAS
# =====================================================

class ActivityResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str] = None
    action_type: str
    action_label: str  # Version lisible de l'action
    target_type: str
    target_id: Optional[int]
    target_name: Optional[str]
    wishlist_id: Optional[int]
    wishlist_title: Optional[str] = None
    created_at: datetime
    icon: str
    color: str

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

ACTION_LABELS = {
    "list_created": ("Liste créée", "plus", "green"),
    "list_updated": ("Liste modifiée", "edit", "blue"),
    "list_deleted": ("Liste supprimée", "trash", "red"),
    "list_shared": ("Liste partagée", "share-2", "purple"),
    "list_shared_external": ("Lien de partage créé", "link", "purple"),
    "wishlist_created": ("Liste créée", "plus", "green"),
    "wishlist_updated": ("Liste modifiée", "edit", "blue"),
    "wishlist_deleted": ("Liste supprimée", "trash", "red"),
    "item_added": ("Article ajouté", "plus-circle", "green"),
    "item_created": ("Article ajouté", "plus-circle", "green"),
    "item_updated": ("Article modifié", "edit-2", "blue"),
    "item_deleted": ("Article supprimé", "trash-2", "red"),
    "item_reserved": ("Article réservé", "bookmark", "orange"),
    "item_purchased": ("Article acheté", "check-circle", "green"),
    "item_unreserved": ("Réservation annulée", "bookmark-x", "gray"),
    "group_created": ("Groupe créé", "users", "blue"),
    "group_updated": ("Groupe modifié", "edit", "blue"),
    "group_deleted": ("Groupe supprimé", "user-minus", "red"),
    "member_added": ("Membre ajouté", "user-plus", "green"),
    "member_removed": ("Membre retiré", "user-x", "orange"),
    "share_created": ("Partage créé", "share", "purple"),
    "share_deleted": ("Partage supprimé", "share-2", "red"),
    "user_login": ("Connexion", "log-in", "gray"),
    "login_failed": ("Tentative de connexion échouée", "alert-triangle", "red"),
    "user_logout": ("Déconnexion", "log-out", "gray"),
    "user_registered": ("Inscription", "user-check", "green"),
}

def get_action_info(action_type: str):
    return ACTION_LABELS.get(action_type, (action_type, "activity", "gray"))

# =====================================================
# ROUTES
# =====================================================

@router.get("/feed", response_model=List[ActivityResponse])
async def get_activity_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Récupérer le feed d'activités de l'utilisateur.
    Inclut: ses propres activités + activités sur listes partagées avec lui
    """
    # 1. Récupérer les IDs des listes de l'utilisateur
    my_lists_result = await session.exec(
        select(Wishlist.id).where(Wishlist.owner_id == current_user.id)
    )
    my_list_ids = list(my_lists_result.all())
    
    # 2. Récupérer les IDs des listes partagées avec l'utilisateur
    shared_list_ids = []
    
    # Partages directs
    direct_shares = await session.exec(
        select(WishlistShare.wishlist_id).where(
            WishlistShare.target_user_id == current_user.id,
            WishlistShare.share_type == "internal",
            WishlistShare.is_active == True
        )
    )
    shared_list_ids.extend(direct_shares.all())
    
    # Partages via groupes
    my_groups = await session.exec(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)
    )
    group_ids = list(my_groups.all())
    
    if group_ids:
        group_shares = await session.exec(
            select(WishlistShare.wishlist_id).where(
                WishlistShare.target_group_id.in_(group_ids),
                WishlistShare.share_type == "internal",
                WishlistShare.is_active == True
            )
        )
        shared_list_ids.extend(group_shares.all())
    
    # Combiner tous les IDs de listes accessibles
    all_list_ids = list(set(my_list_ids + shared_list_ids))
    
    # 3. Récupérer les activités
    query = select(Activity).where(
        or_(
            Activity.user_id == current_user.id,  # Mes activités
            Activity.wishlist_id.in_(all_list_ids) if all_list_ids else False  # Activités sur mes listes
        )
    ).order_by(Activity.created_at.desc()).offset(offset).limit(limit)
    
    result = await session.exec(query)
    activities = result.all()
    
    # 4. Enrichir avec les infos utilisateur et wishlist
    responses = []
    for activity in activities:
        label, icon, color = get_action_info(activity.action_type)
        
        response = ActivityResponse(
            id=activity.id,
            user_id=activity.user_id,
            action_type=activity.action_type,
            action_label=label,
            target_type=activity.target_type,
            target_id=activity.target_id,
            target_name=activity.target_name,
            wishlist_id=activity.wishlist_id,
            created_at=activity.created_at,
            icon=icon,
            color=color
        )
        
        # Récupérer le username
        if activity.user_id:
            user_result = await session.exec(select(User).where(User.id == activity.user_id))
            user = user_result.first()
            if user:
                response.username = user.username
        
        # Récupérer le titre de la wishlist
        if activity.wishlist_id:
            wl_result = await session.exec(select(Wishlist).where(Wishlist.id == activity.wishlist_id))
            wl = wl_result.first()
            if wl:
                response.wishlist_title = wl.title
        
        responses.append(response)
    
    return responses

@router.get("/recent", response_model=List[ActivityResponse])
async def get_recent_activities(
    wishlist_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer les activités récentes (pour une liste spécifique ou globales)"""
    query = select(Activity)
    
    if wishlist_id:
        query = query.where(Activity.wishlist_id == wishlist_id)
    else:
        query = query.where(Activity.user_id == current_user.id)
    
    query = query.order_by(Activity.created_at.desc()).limit(limit)
    
    result = await session.exec(query)
    activities = result.all()
    
    responses = []
    for activity in activities:
        label, icon, color = get_action_info(activity.action_type)
        responses.append(ActivityResponse(
            id=activity.id,
            user_id=activity.user_id,
            action_type=activity.action_type,
            action_label=label,
            target_type=activity.target_type,
            target_id=activity.target_id,
            target_name=activity.target_name,
            wishlist_id=activity.wishlist_id,
            created_at=activity.created_at,
            icon=icon,
            color=color
        ))
    
    return responses
