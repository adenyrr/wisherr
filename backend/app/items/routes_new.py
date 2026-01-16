from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import json

from app.core.async_db import async_engine
from app.auth.deps import get_current_user
from app.models import User, Item, Wishlist, WishlistCollaborator, ItemCategory, ItemPriority, Activity, WishlistShare, GroupMember, Notification

router = APIRouter(prefix="/items", tags=["items"])

# =====================================================
# SCHEMAS
# =====================================================

class ItemOut(BaseModel):
    id: int
    wishlist_id: int
    name: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    priority_id: Optional[int] = None
    priority_name: Optional[str] = None
    priority_color: Optional[str] = None
    status: str = "available"
    custom_attributes: Dict[str, Any] = {}
    sort_order: int = 0
    reserved_by_name: Optional[str] = None
    reserved_at: Optional[datetime] = None
    purchased_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class CreateItemRequest(BaseModel):
    wishlist_id: int
    name: str
    url: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    priority_id: Optional[int] = None
    custom_attributes: Optional[Dict[str, Any]] = None

class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    priority_id: Optional[int] = None
    custom_attributes: Optional[Dict[str, Any]] = None
    sort_order: Optional[int] = None

class ReserveItemRequest(BaseModel):
    reserver_name: Optional[str] = None

class ReorderItemsRequest(BaseModel):
    item_ids: List[int]

class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: str = "tag"

class CategoryResponse(BaseModel):
    id: int
    name: str
    color: str
    icon: str

class PriorityResponse(BaseModel):
    id: int
    name: str
    level: int
    color: str
    icon: Optional[str]

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

async def check_item_access(session: AsyncSession, item_id: int, user: User, require_edit: bool = False):
    """Vérifier l'accès à un article et retourner l'item + wishlist"""
    result = await session.exec(select(Item).where(Item.id == item_id))
    item = result.first()
    if not item:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    wl_result = await session.exec(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.first()
    
    # Propriétaire ou admin
    if wishlist.owner_id == user.id or user.is_admin:
        return item, wishlist, "owner"
    
    # Collaborateur direct
    collab_result = await session.exec(
        select(WishlistCollaborator).where(
            WishlistCollaborator.wishlist_id == wishlist.id,
            WishlistCollaborator.user_id == user.id
        )
    )
    collab = collab_result.first()
    if collab:
        if require_edit and collab.role == "viewer":
            raise HTTPException(status_code=403, detail="Permission insuffisante")
        return item, wishlist, collab.role
    
    # Partage via groupe ou direct
    share_result = await session.exec(
        select(WishlistShare).where(
            WishlistShare.wishlist_id == wishlist.id,
            WishlistShare.share_type == "internal",
            WishlistShare.is_active == True
        )
    )
    for share in share_result.all():
        if share.target_user_id == user.id:
            if require_edit and share.permission == "viewer":
                raise HTTPException(status_code=403, detail="Permission insuffisante")
            return item, wishlist, share.permission
        if share.target_group_id:
            member_result = await session.exec(
                select(GroupMember).where(
                    GroupMember.group_id == share.target_group_id,
                    GroupMember.user_id == user.id
                )
            )
            if member_result.first():
                if require_edit and share.permission == "viewer":
                    raise HTTPException(status_code=403, detail="Permission insuffisante")
                return item, wishlist, share.permission
    
    raise HTTPException(status_code=403, detail="Accès non autorisé")

async def check_wishlist_access(session: AsyncSession, wishlist_id: int, user: User, require_edit: bool = False):
    """Vérifier l'accès à une wishlist"""
    result = await session.exec(select(Wishlist).where(Wishlist.id == wishlist_id))
    wishlist = result.first()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    
    if wishlist.owner_id == user.id or user.is_admin:
        return wishlist, "owner"
    
    collab_result = await session.exec(
        select(WishlistCollaborator).where(
            WishlistCollaborator.wishlist_id == wishlist_id,
            WishlistCollaborator.user_id == user.id
        )
    )
    collab = collab_result.first()
    if collab:
        if require_edit and collab.role == "viewer":
            raise HTTPException(status_code=403, detail="Permission insuffisante")
        return wishlist, collab.role
    
    # Vérifier partages
    share_result = await session.exec(
        select(WishlistShare).where(
            WishlistShare.wishlist_id == wishlist_id,
            WishlistShare.share_type == "internal",
            WishlistShare.is_active == True
        )
    )
    for share in share_result.all():
        if share.target_user_id == user.id:
            if require_edit and share.permission == "viewer":
                raise HTTPException(status_code=403, detail="Permission insuffisante")
            return wishlist, share.permission
        if share.target_group_id:
            member_result = await session.exec(
                select(GroupMember).where(
                    GroupMember.group_id == share.target_group_id,
                    GroupMember.user_id == user.id
                )
            )
            if member_result.first():
                if require_edit and share.permission == "viewer":
                    raise HTTPException(status_code=403, detail="Permission insuffisante")
                return wishlist, share.permission
    
    raise HTTPException(status_code=403, detail="Accès non autorisé")

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

def item_to_response(item: Item, category: ItemCategory = None, priority: ItemPriority = None, hide_reservation_status: bool = False) -> ItemOut:
    # Si hide_reservation_status est True, on masque le statut reserved au propriétaire
    status = item.status
    reserved_by_name = item.reserved_by_name
    reserved_at = item.reserved_at
    
    if hide_reservation_status and status == "reserved":
        status = "available"
        reserved_by_name = None
        reserved_at = None
    
    return ItemOut(
        id=item.id,
        wishlist_id=item.wishlist_id,
        name=item.name,
        url=item.url,
        image_url=item.image_url,
        description=item.description,
        price=item.price,
        category_id=item.category_id,
        category_name=category.name if category else None,
        priority_id=item.priority_id,
        priority_name=priority.name if priority else None,
        priority_color=priority.color if priority else None,
        status=status,
        custom_attributes=item.custom_attributes or {},
        sort_order=item.sort_order,
        reserved_by_name=reserved_by_name,
        reserved_at=reserved_at,
        purchased_at=item.purchased_at,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

async def notify_list_owner(
    session: AsyncSession, 
    wishlist: Wishlist, 
    action_user: User,
    notif_type: str,
    title: str,
    message: str,
    icon: str = "bell",
    color: str = "#6366f1",
    target_type: str = "wishlist",
    target_id: int = None
):
    """Envoyer une notification au propriétaire de la liste (si différent de l'auteur)"""
    if wishlist.owner_id != action_user.id:
        notification = Notification(
            user_id=wishlist.owner_id,
            type=notif_type,
            title=title,
            message=message,
            icon=icon,
            color=color,
            link=f"/wishlists/mine",
            target_type=target_type,
            target_id=target_id or wishlist.id
        )
        session.add(notification)

# =====================================================
# ROUTES - ARTICLES
# =====================================================

@router.get("/test")
async def test_items():
    return {"ok": True, "service": "items"}

@router.get("/wishlist/{wishlist_id}", response_model=List[ItemOut])
async def list_items(
    wishlist_id: int,
    status_filter: Optional[str] = Query(None, description="available, reserved, purchased"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister les articles d'une liste"""
    wishlist, role = await check_wishlist_access(session, wishlist_id, current_user)
    
    # Déterminer si on doit masquer le statut reserved au propriétaire
    # Le propriétaire ne voit les réservations que si notify_owner_on_reservation est activé
    is_owner = (wishlist.owner_id == current_user.id)
    hide_reservation_status = is_owner and not getattr(wishlist, 'notify_owner_on_reservation', True)
    
    query = select(Item).where(Item.wishlist_id == wishlist_id)
    if status_filter:
        query = query.where(Item.status == status_filter)
    
    # Trier: disponibles d'abord par sort_order, puis réservés/achetés en fin
    query = query.order_by(
        Item.status != "available",  # available = 0, autres = 1
        Item.sort_order,
        Item.created_at.desc()
    )
    
    result = await session.exec(query)
    items = result.all()
    
    # Récupérer catégories et priorités
    responses = []
    for item in items:
        category = None
        priority = None
        if item.category_id:
            cat_result = await session.exec(select(ItemCategory).where(ItemCategory.id == item.category_id))
            category = cat_result.first()
        if item.priority_id:
            prio_result = await session.exec(select(ItemPriority).where(ItemPriority.id == item.priority_id))
            priority = prio_result.first()
        responses.append(item_to_response(item, category, priority, hide_reservation_status))
    
    return responses

@router.post("", response_model=ItemOut)
async def create_item(
    payload: CreateItemRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer un nouvel article"""
    wishlist, role = await check_wishlist_access(session, payload.wishlist_id, current_user, require_edit=True)
    wishlist_id = wishlist.id  # Stocker avant commit pour éviter lazy loading
    
    # Obtenir le prochain sort_order
    max_order_result = await session.exec(
        select(Item.sort_order)
        .where(Item.wishlist_id == payload.wishlist_id)
        .order_by(Item.sort_order.desc())
    )
    max_order = max_order_result.first()
    next_order = (max_order or 0) + 1
    
    item = Item(
        wishlist_id=payload.wishlist_id,
        name=payload.name,
        url=payload.url,
        description=payload.description,
        image_url=payload.image_url,
        price=payload.price,
        category_id=payload.category_id,
        priority_id=payload.priority_id,
        sort_order=next_order,
        custom_attributes=payload.custom_attributes or {}
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Construire la réponse avant log_activity pour éviter les problèmes de session
    response = item_to_response(item)
    
    await log_activity(
        session, current_user.id, "item_added", "item", item.id, item.name,
        wishlist_id, {"price": payload.price}
    )
    await session.commit()
    
    return response

@router.get("/{item_id}", response_model=ItemOut)
async def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer un article"""
    item, wishlist, role = await check_item_access(session, item_id, current_user)
    
    category = None
    priority = None
    if item.category_id:
        cat_result = await session.exec(select(ItemCategory).where(ItemCategory.id == item.category_id))
        category = cat_result.first()
    if item.priority_id:
        prio_result = await session.exec(select(ItemPriority).where(ItemPriority.id == item.priority_id))
        priority = prio_result.first()
    
    return item_to_response(item, category, priority)

@router.put("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: int,
    payload: UpdateItemRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier un article"""
    item, wishlist, role = await check_item_access(session, item_id, current_user, require_edit=True)
    wishlist_id = wishlist.id  # Stocker avant commit
    
    if payload.name is not None:
        item.name = payload.name
    if payload.url is not None:
        item.url = payload.url
    if payload.description is not None:
        item.description = payload.description
    if payload.image_url is not None:
        item.image_url = payload.image_url
    if payload.price is not None:
        item.price = payload.price
    if payload.category_id is not None:
        item.category_id = payload.category_id
    if payload.priority_id is not None:
        item.priority_id = payload.priority_id
    if payload.custom_attributes is not None:
        item.custom_attributes = payload.custom_attributes
    if payload.sort_order is not None:
        item.sort_order = payload.sort_order
    
    item.updated_at = datetime.utcnow()
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Construire la réponse avant log_activity
    response = item_to_response(item)
    
    await log_activity(
        session, current_user.id, "item_updated", "item", item.id, item.name,
        wishlist_id
    )
    await session.commit()
    
    return response

@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer un article"""
    item, wishlist, role = await check_item_access(session, item_id, current_user, require_edit=True)
    wishlist_id = wishlist.id  # Stocker avant commit
    
    item_name = item.name
    await session.delete(item)
    await session.commit()
    
    await log_activity(
        session, current_user.id, "item_deleted", "item", item_id, item_name,
        wishlist_id
    )
    await session.commit()
    
    return {"ok": True}

@router.post("/{item_id}/reserve")
async def reserve_item(
    item_id: int,
    payload: ReserveItemRequest = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Réserver un article (propriétaire ou invité)"""
    item, wishlist, role = await check_item_access(session, item_id, current_user)
    wishlist_id = wishlist.id  # Stocker avant commit
    wishlist_title = wishlist.title
    wishlist_owner_id = wishlist.owner_id
    notify_owner = wishlist.notify_owner_on_reservation
    
    if item.status != "available":
        raise HTTPException(status_code=400, detail="Cet article n'est pas disponible")
    
    # Le propriétaire peut aussi réserver (pour marquer comme 'déjà acheté' ou 'pris en charge')
    item.status = "reserved"
    item.reserved_by = current_user.id
    item.reserved_by_name = payload.reserver_name if payload and payload.reserver_name else current_user.username
    item.reserved_at = datetime.utcnow()
    item.updated_at = datetime.utcnow()
    
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Stocker les valeurs pour éviter les problèmes de session
    item_id = item.id
    item_name = item.name
    reserved_by_name = item.reserved_by_name
    
    await log_activity(
        session, current_user.id, "item_reserved", "item", item_id, item_name,
        wishlist_id, {"reserved_by": reserved_by_name}
    )
    
    # Collecter tous les utilisateurs à notifier (sauf le réservateur)
    users_to_notify = set()
    
    # 1. Notifier le propriétaire si le toggle est activé et ce n'est pas lui qui réserve
    if notify_owner and wishlist_owner_id != current_user.id:
        users_to_notify.add(wishlist_owner_id)
    
    # 2. Notifier les collaborateurs directs de la liste (sauf le réservateur)
    collab_result = await session.exec(
        select(WishlistCollaborator.user_id).where(
            WishlistCollaborator.wishlist_id == wishlist_id,
            WishlistCollaborator.user_id != current_user.id
        )
    )
    for collab in collab_result.all():
        users_to_notify.add(collab)
    
    # 3. Notifier les membres des groupes avec qui la liste est partagée (sauf le réservateur)
    shares_result = await session.exec(
        select(WishlistShare.target_group_id).where(
            WishlistShare.wishlist_id == wishlist_id,
            WishlistShare.share_type == "internal",
            WishlistShare.target_group_id.isnot(None),
            WishlistShare.is_active == True
        )
    )
    group_ids = [g for g in shares_result.all() if g is not None]
    
    if group_ids:
        members_result = await session.exec(
            select(GroupMember.user_id).where(
                GroupMember.group_id.in_(group_ids),
                GroupMember.user_id != current_user.id
            )
        )
        for member in members_result.all():
            users_to_notify.add(member)
    
    # Envoyer les notifications
    for user_id in users_to_notify:
        notification = Notification(
            user_id=user_id,
            type="item_reserved",
            title=f"Article réservé : {item_name}",
            message=f"{current_user.username} a réservé l'article « {item_name} » dans la liste « {wishlist_title} »",
            icon="gift",
            color="#22c55e",
            link=f"/wishlists/{wishlist_id}" if user_id != wishlist_owner_id else "/wishlists/mine",
            target_type="item",
            target_id=item_id
        )
        session.add(notification)
    
    await session.commit()
    
    return {"ok": True, "message": f"Article réservé par {reserved_by_name}"}

@router.post("/{item_id}/purchase")
async def mark_purchased(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Marquer un article comme acheté"""
    item, wishlist, role = await check_item_access(session, item_id, current_user)
    wishlist_id = wishlist.id  # Stocker avant commit
    wishlist_title = wishlist.title
    wishlist_owner_id = wishlist.owner_id
    notify_owner = wishlist.notify_owner_on_reservation
    
    item.status = "purchased"
    item.purchased_at = datetime.utcnow()
    item.updated_at = datetime.utcnow()
    
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    # Stocker les valeurs pour éviter les problèmes de session
    item_id_val = item.id
    item_name = item.name
    
    await log_activity(
        session, current_user.id, "item_purchased", "item", item_id_val, item_name,
        wishlist_id
    )
    
    # Collecter tous les utilisateurs à notifier (sauf l'acheteur)
    users_to_notify = set()
    
    # 1. Notifier le propriétaire si le toggle est activé et ce n'est pas lui qui achète
    if notify_owner and wishlist_owner_id != current_user.id:
        users_to_notify.add(wishlist_owner_id)
    
    # 2. Notifier les collaborateurs directs de la liste (sauf l'acheteur)
    collab_result = await session.exec(
        select(WishlistCollaborator.user_id).where(
            WishlistCollaborator.wishlist_id == wishlist_id,
            WishlistCollaborator.user_id != current_user.id
        )
    )
    for collab in collab_result.all():
        users_to_notify.add(collab)
    
    # 3. Notifier les membres des groupes avec qui la liste est partagée (sauf l'acheteur)
    shares_result = await session.exec(
        select(WishlistShare.target_group_id).where(
            WishlistShare.wishlist_id == wishlist_id,
            WishlistShare.share_type == "internal",
            WishlistShare.target_group_id.isnot(None),
            WishlistShare.is_active == True
        )
    )
    group_ids = [g for g in shares_result.all() if g is not None]
    
    if group_ids:
        members_result = await session.exec(
            select(GroupMember.user_id).where(
                GroupMember.group_id.in_(group_ids),
                GroupMember.user_id != current_user.id
            )
        )
        for member in members_result.all():
            users_to_notify.add(member)
    
    # Envoyer les notifications
    for user_id in users_to_notify:
        notification = Notification(
            user_id=user_id,
            type="item_purchased",
            title=f"Article acheté : {item_name}",
            message=f"{current_user.username} a marqué l'article « {item_name} » comme acheté dans la liste « {wishlist_title} »",
            icon="check-circle",
            color="#8b5cf6",
            link=f"/wishlists/{wishlist_id}" if user_id != wishlist_owner_id else "/wishlists/mine",
            target_type="item",
            target_id=item_id_val
        )
        session.add(notification)
    
    await session.commit()
    
    return {"ok": True, "message": "Article marqué comme acheté"}

@router.post("/{item_id}/unreserve")
async def unreserve_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Annuler une réservation"""
    item, wishlist, role = await check_item_access(session, item_id, current_user, require_edit=True)
    
    if item.status not in ["reserved", "purchased"]:
        raise HTTPException(status_code=400, detail="Cet article n'est pas réservé")
    
    item.status = "available"
    item.reserved_by = None
    item.reserved_by_name = None
    item.reserved_at = None
    item.purchased_at = None
    item.updated_at = datetime.utcnow()
    
    session.add(item)
    await session.commit()
    
    return {"ok": True, "message": "Réservation annulée"}

@router.post("/reorder")
async def reorder_items(
    payload: ReorderItemsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Réorganiser les articles"""
    if not payload.item_ids:
        raise HTTPException(status_code=400, detail="Liste d'articles vide")
    
    # Vérifier accès au premier article pour avoir la wishlist
    first_result = await session.exec(select(Item).where(Item.id == payload.item_ids[0]))
    first_item = first_result.first()
    if not first_item:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    await check_wishlist_access(session, first_item.wishlist_id, current_user, require_edit=True)
    
    # Mettre à jour l'ordre
    for i, item_id in enumerate(payload.item_ids):
        result = await session.exec(select(Item).where(Item.id == item_id))
        item = result.first()
        if item:
            item.sort_order = i
            session.add(item)
    
    await session.commit()
    return {"ok": True}

# =====================================================
# ROUTES - CATÉGORIES
# =====================================================

@router.get("/categories/list", response_model=List[CategoryResponse])
async def list_categories(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister les catégories de l'utilisateur"""
    result = await session.exec(
        select(ItemCategory).where(ItemCategory.user_id == current_user.id)
    )
    return result.all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer une catégorie"""
    category = ItemCategory(
        user_id=current_user.id,
        name=payload.name,
        color=payload.color,
        icon=payload.icon
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer une catégorie"""
    result = await session.exec(
        select(ItemCategory).where(
            ItemCategory.id == category_id,
            ItemCategory.user_id == current_user.id
        )
    )
    category = result.first()
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    await session.delete(category)
    await session.commit()
    return {"ok": True}

# =====================================================
# ROUTES - PRIORITÉS
# =====================================================

@router.get("/priorities/list", response_model=List[PriorityResponse])
async def list_priorities(
    session: AsyncSession = Depends(get_async_session)
):
    """Lister toutes les priorités disponibles"""
    result = await session.exec(
        select(ItemPriority).order_by(ItemPriority.level)
    )
    return result.all()
