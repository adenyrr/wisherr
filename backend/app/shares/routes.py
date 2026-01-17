from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from passlib.context import CryptContext
import secrets
import os

from app.models import (
    WishlistShare, Wishlist, Group, GroupMember, User, Activity, Notification
)
from app.auth.deps import get_current_user
from app.core.async_db import async_engine

router = APIRouter(prefix="/shares", tags=["shares"])
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# URL publique pour les liens de partage
WISHERR_URL = os.getenv("WISHERR_URL", "http://localhost:8080")

# =====================================================
# SCHEMAS
# =====================================================

class ShareCreateInternal(BaseModel):
    wishlist_id: int
    # Nouveau format simplifié (utilisé par le frontend)
    username: Optional[str] = None  # Pour partage vers utilisateur
    group_id: Optional[int] = None  # Pour partage vers groupe
    # Ancien format (backward compatible)
    target_type: Optional[str] = None  # "group" ou "user"
    target_id: Optional[int] = None  # group_id ou user_id
    permission: str = "viewer"  # viewer ou editor
    notify_on_reservation: bool = False  # Notifier le propriétaire des réservations

class ShareCreateExternal(BaseModel):
    wishlist_id: int
    password: str  # Obligatoire, min 4 caractères
    expires_in_days: Optional[int] = None
    notify_on_reservation: bool = False  # Notifier le propriétaire des réservations

class ShareUpdatePassword(BaseModel):
    new_password: str

class ShareResponse(BaseModel):
    id: int
    wishlist_id: int
    wishlist_title: str
    share_type: str
    permission: str
    target_group_id: Optional[int] = None
    target_group_name: Optional[str] = None
    target_user_id: Optional[int] = None
    target_username: Optional[str] = None
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    share_password: Optional[str] = None  # Retourné à la création uniquement
    notify_on_reservation: bool = False
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

class SharedWithMeResponse(BaseModel):
    id: int
    wishlist_id: int
    wishlist_title: str
    wishlist_description: Optional[str]
    owner_username: str
    permission: str
    share_type: str
    shared_via: str  # "group:GroupName" ou "direct"

class ExternalAccessRequest(BaseModel):
    password: Optional[str] = None

class ExternalReserveRequest(BaseModel):
    password: str
    visitor_name: str = Field(min_length=2)

class ExternalAccessResponse(BaseModel):
    valid: bool
    wishlist_id: Optional[int] = None
    wishlist_title: Optional[str] = None
    items: Optional[List[dict]] = None

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

def generate_share_token() -> str:
    return secrets.token_urlsafe(32)

async def log_activity(session: AsyncSession, user_id: int, action_type: str,
                       target_type: str, target_id: int, target_name: str,
                       wishlist_id: int = None, extra_data: dict = None):
    activity = Activity(
        user_id=user_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        wishlist_id=wishlist_id,
        extra_data=extra_data or {},
        is_public=True
    )
    session.add(activity)
    # Commit délégué à l'appelant

async def verify_wishlist_ownership(session: AsyncSession, wishlist_id: int, user_id: int) -> Wishlist:
    result = await session.exec(select(Wishlist).where(Wishlist.id == wishlist_id))
    wishlist = result.first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    if wishlist.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas propriétaire de cette liste")
    return wishlist

# =====================================================
# ROUTES - GESTION DES PARTAGES
# =====================================================

@router.get("", response_model=List[ShareResponse])
async def list_my_shares(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister tous les partages créés par l'utilisateur"""
    result = await session.exec(
        select(WishlistShare, Wishlist)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .where(WishlistShare.created_by == current_user.id)
        .order_by(WishlistShare.created_at.desc())
    )
    
    shares = []
    for share, wishlist in result.all():
        response = ShareResponse(
            id=share.id,
            wishlist_id=share.wishlist_id,
            wishlist_title=wishlist.title,
            share_type=share.share_type,
            permission=share.permission,
            target_group_id=share.target_group_id,
            target_user_id=share.target_user_id,
            share_token=share.share_token,
            share_url=f"{WISHERR_URL}/shared/{share.share_token}" if share.share_token else None,
            created_at=share.created_at,
            expires_at=share.expires_at,
            is_active=share.is_active
        )
        
        # Récupérer les noms des cibles
        if share.target_group_id:
            group_result = await session.exec(select(Group).where(Group.id == share.target_group_id))
            group = group_result.first()
            if group:
                response.target_group_name = group.name
        
        if share.target_user_id:
            user_result = await session.exec(select(User).where(User.id == share.target_user_id))
            user = user_result.first()
            if user:
                response.target_username = user.username
        
        shares.append(response)
    
    return shares

@router.get("/shared-with-me", response_model=List[SharedWithMeResponse])
async def list_shared_with_me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister toutes les listes partagées avec l'utilisateur"""
    # Trouver les groupes dont l'utilisateur est membre
    groups_result = await session.exec(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)
    )
    my_group_ids = [gm for gm in groups_result.all()]
    
    shares = []
    
    # Partages directs vers l'utilisateur
    direct_result = await session.exec(
        select(WishlistShare, Wishlist, User)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .join(User, User.id == Wishlist.owner_id)
        .where(
            WishlistShare.share_type == "internal",
            WishlistShare.target_user_id == current_user.id,
            WishlistShare.is_active == True
        )
    )
    for share, wishlist, owner in direct_result.all():
        shares.append(SharedWithMeResponse(
            id=share.id,
            wishlist_id=wishlist.id,
            wishlist_title=wishlist.title,
            wishlist_description=wishlist.description,
            owner_username=owner.username,
            permission=share.permission,
            share_type="internal",
            shared_via="direct"
        ))
    
    # Partages via groupes
    if my_group_ids:
        for group_id in my_group_ids:
            group_result = await session.exec(
                select(WishlistShare, Wishlist, User, Group)
                .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
                .join(User, User.id == Wishlist.owner_id)
                .join(Group, Group.id == WishlistShare.target_group_id)
                .where(
                    WishlistShare.share_type == "internal",
                    WishlistShare.target_group_id == group_id,
                    WishlistShare.is_active == True,
                    Wishlist.owner_id != current_user.id  # Pas ses propres listes
                )
            )
            for share, wishlist, owner, group in group_result.all():
                # Éviter les doublons
                if not any(s.wishlist_id == wishlist.id for s in shares):
                    shares.append(SharedWithMeResponse(
                        id=share.id,
                        wishlist_id=wishlist.id,
                        wishlist_title=wishlist.title,
                        wishlist_description=wishlist.description,
                        owner_username=owner.username,
                        permission=share.permission,
                        share_type="internal",
                        shared_via=f"group:{group.name}"
                    ))
    
    return shares

@router.post("/internal", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_internal_share(
    payload: ShareCreateInternal,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer un partage interne (vers groupe ou utilisateur)"""
    wishlist = await verify_wishlist_ownership(session, payload.wishlist_id, current_user.id)
    
    # Stocker les valeurs nécessaires pour éviter les problèmes de session après commit
    wishlist_id = wishlist.id
    wishlist_title = wishlist.title
    
    if payload.permission not in ["viewer", "editor"]:
        raise HTTPException(status_code=400, detail="Permission invalide (viewer ou editor)")
    
    target_group_id = None
    target_user_id = None
    target_name = ""
    target_type = ""
    
    # Déterminer le type de cible (nouveau format ou ancien)
    if payload.username:
        # Nouveau format: partage vers utilisateur par username/email
        from sqlmodel import or_
        search_term = payload.username.strip()
        user_result = await session.exec(
            select(User).where(
                or_(
                    User.username == search_term,
                    User.email == search_term
                ),
                User.deleted_at == None
            )
        )
        user = user_result.first()
        if not user:
            raise HTTPException(status_code=404, detail=f"Utilisateur '{search_term}' non trouvé")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas partager avec vous-même")
        target_user_id = user.id
        target_name = user.username
        target_type = "user"
        
    elif payload.group_id:
        # Nouveau format: partage vers groupe par group_id
        group_result = await session.exec(select(Group).where(Group.id == payload.group_id))
        group = group_result.first()
        if not group:
            raise HTTPException(status_code=404, detail="Groupe non trouvé")
        # Vérifier si l'utilisateur est propriétaire ou membre
        if group.owner_id != current_user.id:
            member_result = await session.exec(
                select(GroupMember).where(
                    GroupMember.group_id == group.id,
                    GroupMember.user_id == current_user.id
                )
            )
            if not member_result.first():
                raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce groupe")
        target_group_id = group.id
        target_name = group.name
        target_type = "group"
        
    elif payload.target_type and payload.target_id:
        # Ancien format: target_type + target_id
        if payload.target_type == "group":
            group_result = await session.exec(select(Group).where(Group.id == payload.target_id))
            group = group_result.first()
            if not group:
                raise HTTPException(status_code=404, detail="Groupe non trouvé")
            if group.owner_id != current_user.id:
                member_result = await session.exec(
                    select(GroupMember).where(
                        GroupMember.group_id == group.id,
                        GroupMember.user_id == current_user.id
                    )
                )
                if not member_result.first():
                    raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce groupe")
            target_group_id = group.id
            target_name = group.name
            target_type = "group"
            
        elif payload.target_type == "user":
            user_result = await session.exec(select(User).where(User.id == payload.target_id))
            user = user_result.first()
            if not user:
                raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
            target_user_id = user.id
            target_name = user.username
            target_type = "user"
        else:
            raise HTTPException(status_code=400, detail="target_type invalide (group ou user)")
    else:
        raise HTTPException(status_code=400, detail="Veuillez spécifier username ou group_id")
    
    # Vérifier si ce partage existe déjà
    existing_result = await session.exec(
        select(WishlistShare).where(
            WishlistShare.wishlist_id == payload.wishlist_id,
            WishlistShare.target_group_id == target_group_id if target_group_id else True,
            WishlistShare.target_user_id == target_user_id if target_user_id else True,
            WishlistShare.share_type == "internal"
        )
    )
    if existing_result.first():
        raise HTTPException(status_code=400, detail="Ce partage existe déjà")
    
    share = WishlistShare(
        wishlist_id=payload.wishlist_id,
        share_type="internal",
        target_group_id=target_group_id,
        target_user_id=target_user_id,
        permission=payload.permission,
        created_by=current_user.id,
        notify_on_reservation=payload.notify_on_reservation
    )
    session.add(share)
    await session.commit()
    await session.refresh(share)
    
    await log_activity(
        session, current_user.id, "list_shared", "share", share.id,
        f"{wishlist_title} → {target_name}", wishlist_id,
        {"target_type": target_type, "permission": payload.permission}
    )
    await session.commit()
    
    # Envoyer une notification au(x) destinataire(s)
    if target_user_id:
        # Notification à l'utilisateur cible
        notification = Notification(
            user_id=target_user_id,
            type="share_received",
            title="Nouvelle liste partagée",
            message=f"{current_user.username} a partagé la liste \"{wishlist_title}\" avec vous",
            icon="share",
            color="#22c55e",
            link="/wishlists/shared",
            target_type="wishlist",
            target_id=wishlist_id
        )
        session.add(notification)
        await session.commit()
    elif target_group_id:
        # Notification à tous les membres du groupe (sauf le créateur)
        members_result = await session.exec(
            select(GroupMember).where(
                GroupMember.group_id == target_group_id,
                GroupMember.user_id != current_user.id
            )
        )
        for member in members_result.all():
            notification = Notification(
                user_id=member.user_id,
                type="share_received",
                title="Nouvelle liste partagée",
                message=f"{current_user.username} a partagé la liste \"{wishlist_title}\" avec le groupe \"{target_name}\"",
                icon="users",
                color="#22c55e",
                link="/wishlists/shared",
                target_type="wishlist",
                target_id=wishlist_id
            )
            session.add(notification)
        await session.commit()
    
    # Refresh share après tous les commits pour éviter MissingGreenlet
    await session.refresh(share)
    
    return ShareResponse(
        id=share.id,
        wishlist_id=share.wishlist_id,
        wishlist_title=wishlist_title,
        share_type=share.share_type,
        permission=share.permission,
        target_group_id=target_group_id,
        target_group_name=target_name if target_group_id else None,
        target_user_id=target_user_id,
        target_username=target_name if target_user_id else None,
        created_at=share.created_at,
        expires_at=share.expires_at,
        is_active=share.is_active
    )

@router.post("/external", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_external_share(
    payload: ShareCreateExternal,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer un partage externe (lien public avec mot de passe obligatoire)"""
    wishlist = await verify_wishlist_ownership(session, payload.wishlist_id, current_user.id)
    
    # Stocker les valeurs avant tout commit pour éviter MissingGreenlet
    wishlist_id = wishlist.id
    wishlist_title = wishlist.title
    
    # Mot de passe obligatoire
    password = payload.password
    if not password or len(password) < 4:
        raise HTTPException(status_code=400, detail="Le mot de passe est obligatoire et doit faire au moins 4 caractères")
    
    # Vérifier si un partage externe existe déjà
    existing_result = await session.exec(
        select(WishlistShare).where(
            WishlistShare.wishlist_id == payload.wishlist_id,
            WishlistShare.share_type == "external",
            WishlistShare.is_active == True
        )
    )
    existing = existing_result.first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Un partage externe existe déjà. Modifiez-le ou supprimez-le d'abord."
        )
    
    expires_at = None
    if payload.expires_in_days:
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
    
    share = WishlistShare(
        wishlist_id=payload.wishlist_id,
        share_type="external",
        permission="viewer",  # Externe = toujours viewer
        share_token=generate_share_token(),
        share_password_hash=pwd_context.hash(password),
        notify_on_reservation=payload.notify_on_reservation,
        created_by=current_user.id,
        expires_at=expires_at
    )
    session.add(share)
    await session.commit()
    await session.refresh(share)
    
    share_url = f"{WISHERR_URL}/shared/{share.share_token}"
    await log_activity(
        session, current_user.id, "list_shared_external", "share", share.id,
        wishlist_title, wishlist_id, {"share_url": share_url, "share_token": share.share_token}
    )
    await session.commit()
    await session.refresh(share)  # Refresh après commit pour éviter MissingGreenlet
    
    return ShareResponse(
        id=share.id,
        wishlist_id=share.wishlist_id,
        wishlist_title=wishlist_title,
        share_type=share.share_type,
        permission=share.permission,
        share_token=share.share_token,
        share_url=f"{WISHERR_URL}/shared/{share.share_token}",
        share_password=password,  # Retourné en clair à la création
        notify_on_reservation=share.notify_on_reservation,
        created_at=share.created_at,
        expires_at=share.expires_at,
        is_active=share.is_active
    )

@router.put("/{share_id}/password")
async def update_share_password(
    share_id: int,
    payload: ShareUpdatePassword,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier le mot de passe d'un partage externe"""
    result = await session.exec(select(WishlistShare).where(WishlistShare.id == share_id))
    share = result.first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
    
    if share.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le créateur de ce partage")
    
    if share.share_type != "external":
        raise HTTPException(status_code=400, detail="Seuls les partages externes ont un mot de passe")
    
    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 4 caractères")
    
    share.share_password_hash = pwd_context.hash(payload.new_password)
    share.updated_at = datetime.utcnow()
    session.add(share)
    await session.commit()
    
    return {"ok": True, "message": "Mot de passe modifié"}

@router.put("/{share_id}/notifications")
async def toggle_share_notifications(
    share_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Activer/désactiver les notifications de réservation pour un partage"""
    result = await session.exec(select(WishlistShare).where(WishlistShare.id == share_id))
    share = result.first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
    
    if share.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le créateur de ce partage")
    
    share.notify_on_reservation = not share.notify_on_reservation
    share.updated_at = datetime.utcnow()
    session.add(share)
    await session.commit()
    
    return {"ok": True, "notify_on_reservation": share.notify_on_reservation}

@router.put("/{share_id}/toggle")
async def toggle_share(
    share_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Activer/désactiver un partage"""
    result = await session.exec(select(WishlistShare).where(WishlistShare.id == share_id))
    share = result.first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
    
    if share.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le créateur de ce partage")
    
    share.is_active = not share.is_active
    share.updated_at = datetime.utcnow()
    session.add(share)
    await session.commit()
    
    return {"ok": True, "is_active": share.is_active}

@router.delete("/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share(
    share_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer un partage"""
    result = await session.exec(select(WishlistShare).where(WishlistShare.id == share_id))
    share = result.first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
    
    if share.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le créateur de ce partage")
    
    await session.delete(share)
    await session.commit()


class ShareUpdatePermission(BaseModel):
    permission: str  # viewer ou editor


@router.put("/{share_id}/permission")
async def update_share_permission(
    share_id: int,
    payload: ShareUpdatePermission,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier la permission d'un partage interne"""
    if payload.permission not in ("viewer", "editor"):
        raise HTTPException(status_code=400, detail="Permission invalide (viewer ou editor)")
    
    result = await session.exec(select(WishlistShare).where(WishlistShare.id == share_id))
    share = result.first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Partage non trouvé")
    
    if share.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le créateur de ce partage")
    
    if share.share_type != "internal":
        raise HTTPException(status_code=400, detail="Seuls les partages internes ont une permission")
    
    share.permission = payload.permission
    share.updated_at = datetime.utcnow()
    session.add(share)
    await session.commit()
    
    return {"ok": True, "permission": share.permission}

# =====================================================
# ROUTES - ACCÈS EXTERNE (SANS AUTH)
# =====================================================

@router.get("/external/{token}")
async def get_external_share_info(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer les infos d'un partage externe (sans auth, sans contenu)"""
    result = await session.exec(
        select(WishlistShare, Wishlist, User)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .join(User, User.id == Wishlist.owner_id)
        .where(WishlistShare.share_token == token)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Lien de partage invalide")
    
    share, wishlist, owner = row
    
    if not share.is_active:
        raise HTTPException(status_code=403, detail="Ce partage a été désactivé")
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Ce partage a expiré")
    
    return {
        "wishlist_title": wishlist.title,
        "wishlist_description": wishlist.description,
        "requires_password": share.share_password_hash is not None,
        "occasion": wishlist.occasion,
        "event_date": wishlist.event_date,
        "owner_name": owner.username
    }

@router.post("/external/{token}/access", response_model=ExternalAccessResponse)
async def access_external_share(
    token: str,
    payload: ExternalAccessRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Accéder à un partage externe avec mot de passe"""
    from app.models import Item
    
    result = await session.exec(
        select(WishlistShare, Wishlist)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .where(WishlistShare.share_token == token)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Lien de partage invalide")
    
    share, wishlist = row
    
    if not share.is_active:
        raise HTTPException(status_code=403, detail="Ce partage a été désactivé")
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Ce partage a expiré")
    
    # Vérifier le mot de passe seulement s'il est requis
    if share.share_password_hash:
        if not payload.password:
            raise HTTPException(status_code=401, detail="Mot de passe requis")
        if not pwd_context.verify(payload.password, share.share_password_hash):
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    # Récupérer les articles
    items_result = await session.exec(
        select(Item)
        .where(Item.wishlist_id == wishlist.id)
        .order_by(Item.sort_order, Item.created_at)
    )
    items = items_result.all()
    
    # Les utilisateurs externes (partagés) voient TOUJOURS le statut de réservation
    # car ils ne sont pas le propriétaire - la logique notify_owner_on_reservation
    # ne s'applique qu'au propriétaire
    
    return ExternalAccessResponse(
        valid=True,
        wishlist_id=wishlist.id,
        wishlist_title=wishlist.title,
        items=[
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "url": item.url,
                "image_url": item.image_url,
                "price": item.price,
                "status": item.status,
                "reserved_by_name": item.reserved_by_name,
                "custom_attributes": item.custom_attributes or {}
            }
            for item in items
        ]
    )

@router.post("/external/{token}/reserve/{item_id}")
async def reserve_item_external(
    token: str,
    item_id: int,
    payload: ExternalReserveRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Réserver un article via partage externe"""
    from app.models import Item
    
    # Vérifier le partage
    result = await session.exec(
        select(WishlistShare, Wishlist)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .where(WishlistShare.share_token == token)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Lien de partage invalide")
    
    share, wishlist = row
    
    # Stocker les valeurs pour éviter MissingGreenlet
    wishlist_owner_id = wishlist.owner_id
    wishlist_title = wishlist.title
    notify_owner = share.notify_on_reservation
    
    if not share.is_active:
        raise HTTPException(status_code=403, detail="Ce partage a été désactivé")
    
    if not pwd_context.verify(payload.password, share.share_password_hash):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    reserver_name = payload.visitor_name
    
    # Récupérer l'article
    item_result = await session.exec(
        select(Item).where(Item.id == item_id, Item.wishlist_id == wishlist.id)
    )
    item = item_result.first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    if item.status != "available":
        raise HTTPException(status_code=400, detail="Cet article est déjà réservé ou acheté")
    
    # Stocker le nom avant commit
    item_name = item.name
    
    item.status = "reserved"
    item.reserved_by_name = reserver_name
    item.reserved_at = datetime.utcnow()
    item.updated_at = datetime.utcnow()
    
    session.add(item)
    await session.commit()
    
    # Notifier le propriétaire seulement si l'option est activée
    if notify_owner:
        from app.models import Notification
        notification = Notification(
            user_id=wishlist_owner_id,
            type="item_reserved",
            title=f"Article réservé : {item_name}",
            message=f"{reserver_name} a réservé l'article « {item_name} » dans votre liste « {wishlist_title} » (via lien externe)",
            icon="gift",
            color="#22c55e",
            link="/wishlists/mine",
            target_type="item",
            target_id=item_id
        )
        session.add(notification)
        await session.commit()
    
    return {"ok": True, "message": f"Article réservé par {reserver_name}"}

@router.post("/external/{token}/purchase/{item_id}")
async def mark_purchased_external(
    token: str,
    item_id: int,
    payload: ExternalAccessRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Marquer un article comme acheté via partage externe"""
    from app.models import Item
    
    result = await session.exec(
        select(WishlistShare, Wishlist)
        .join(Wishlist, Wishlist.id == WishlistShare.wishlist_id)
        .where(WishlistShare.share_token == token)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Lien de partage invalide")
    
    share, wishlist = row
    
    if not pwd_context.verify(payload.password, share.share_password_hash):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    item_result = await session.exec(
        select(Item).where(Item.id == item_id, Item.wishlist_id == wishlist.id)
    )
    item = item_result.first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    item.status = "purchased"
    item.purchased_at = datetime.utcnow()
    item.updated_at = datetime.utcnow()
    
    session.add(item)
    await session.commit()
    
    return {"ok": True, "message": "Article marqué comme acheté"}
