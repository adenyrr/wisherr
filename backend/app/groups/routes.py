from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models import Group, GroupMember, User, Activity, Notification
from app.auth.deps import get_current_user
from app.core.async_db import async_engine

router = APIRouter(prefix="/groups", tags=["groups"])

# =====================================================
# SCHEMAS
# =====================================================

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GroupMemberAdd(BaseModel):
    username: str

class MemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    added_at: datetime

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime
    updated_at: datetime
    members: List[MemberResponse] = []
    member_count: int = 0

class GroupListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    member_count: int
    created_at: datetime
    owner_id: int

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

async def log_activity(session: AsyncSession, user_id: int, action_type: str, 
                       target_type: str, target_id: int, target_name: str, extra_data: dict = None):
    activity = Activity(
        user_id=user_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        extra_data=extra_data or {},
        is_public=False
    )
    session.add(activity)
    # Ne pas commit ici - le commit sera fait par l'appelant

# =====================================================
# ROUTES
# =====================================================

@router.get("", response_model=List[GroupListResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Liste tous les groupes de l'utilisateur (créés par lui ou dont il est membre)"""
    # Groupes créés par l'utilisateur
    result = await session.exec(
        select(Group).where(Group.owner_id == current_user.id)
    )
    owned_groups = result.all()
    
    # Groupes dont l'utilisateur est membre
    result = await session.exec(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id)
    )
    member_groups = result.all()
    
    # Fusionner et dédupliquer
    all_groups = {g.id: g for g in owned_groups}
    for g in member_groups:
        all_groups[g.id] = g
    
    # Compter les membres pour chaque groupe
    responses = []
    for group in all_groups.values():
        count_result = await session.exec(
            select(GroupMember).where(GroupMember.group_id == group.id)
        )
        member_count = len(count_result.all())
        responses.append(GroupListResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            member_count=member_count,
            created_at=group.created_at,
            owner_id=group.owner_id
        ))
    
    return responses

@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer un nouveau groupe"""
    group = Group(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description
    )
    session.add(group)
    await session.commit()
    await session.refresh(group)
    
    # Ajouter le créateur comme membre automatiquement
    owner_member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        added_by=current_user.id
    )
    session.add(owner_member)
    await session.commit()
    await session.refresh(owner_member)
    
    # Log activity
    await log_activity(session, current_user.id, "group_created", "group", group.id, group.name)
    await session.commit()
    
    # Refresh pour éviter MissingGreenlet après le dernier commit
    await session.refresh(group)
    await session.refresh(owner_member)
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=[MemberResponse(
            id=owner_member.id,
            user_id=current_user.id,
            username=current_user.username,
            added_at=owner_member.added_at
        )],
        member_count=1
    )

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer un groupe avec ses membres"""
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    # Vérifier l'accès (propriétaire ou membre)
    is_member = False
    if group.owner_id != current_user.id:
        member_result = await session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.id
            )
        )
        is_member = member_result.first() is not None
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Accès non autorisé à ce groupe")
    
    # Récupérer les membres
    members_result = await session.exec(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
    )
    members = []
    for gm, user in members_result.all():
        members.append(MemberResponse(
            id=gm.id,
            user_id=user.id,
            username=user.username,
            added_at=gm.added_at
        ))
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
        member_count=len(members)
    )

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    payload: GroupUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier un groupe (propriétaire uniquement)"""
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut modifier ce groupe")
    
    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    group.updated_at = datetime.utcnow()
    
    session.add(group)
    await session.commit()
    await session.refresh(group)
    
    await log_activity(session, current_user.id, "group_updated", "group", group.id, group.name)
    await session.commit()
    await session.refresh(group)  # Refresh après commit pour éviter MissingGreenlet
    
    # Récupérer les membres pour la réponse
    members_result = await session.exec(
        select(GroupMember, User)
        .join(User, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
    )
    members = [
        MemberResponse(id=gm.id, user_id=u.id, username=u.username, added_at=gm.added_at)
        for gm, u in members_result.all()
    ]
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        owner_id=group.owner_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
        member_count=len(members)
    )

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer un groupe (propriétaire uniquement)"""
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer ce groupe")
    
    # Stocker les infos avant suppression pour le log
    group_name = group.name
    group_id_val = group.id
    
    await session.delete(group)
    await log_activity(session, current_user.id, "group_deleted", "group", group_id_val, group_name)
    await session.commit()

@router.post("/{group_id}/members", response_model=MemberResponse)
async def add_member(
    group_id: int,
    payload: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Ajouter un membre au groupe par son pseudo ou email"""
    from sqlmodel import or_
    
    # Vérifier que le groupe existe et que l'utilisateur est propriétaire
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut ajouter des membres")
    
    # Chercher l'utilisateur par pseudo OU email
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
    target_user = user_result.first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail=f"Utilisateur '{search_term}' non trouvé (pseudo ou email)")
    
    # Stocker les valeurs avant tout commit pour éviter MissingGreenlet
    target_user_id = target_user.id
    target_user_username = target_user.username
    group_name = group.name
    group_id_val = group.id
    
    # Vérifier si déjà membre
    existing_result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == target_user_id
        )
    )
    if existing_result.first():
        raise HTTPException(status_code=400, detail=f"'{target_user_username}' est déjà membre de ce groupe")
    
    # Ajouter le membre
    member = GroupMember(
        group_id=group_id,
        user_id=target_user_id,
        added_by=current_user.id
    )
    session.add(member)
    
    # Notifier l'utilisateur ajouté au groupe
    notification = Notification(
        user_id=target_user_id,
        type="group_added",
        title=f"Ajouté au groupe « {group_name} »",
        message=f"{current_user.username} vous a ajouté au groupe « {group_name} »",
        icon="users",
        color="#8b5cf6",
        link="/groups",
        target_type="group",
        target_id=group_id_val
    )
    session.add(notification)
    
    await log_activity(
        session, current_user.id, "member_added", "group", group_id, group_name,
        {"member_username": target_user_username}
    )
    
    # Un seul commit pour tout
    await session.commit()
    await session.refresh(member)
    
    return MemberResponse(
        id=member.id,
        user_id=target_user_id,
        username=target_user_username,
        added_at=member.added_at
    )

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Retirer un membre du groupe"""
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    # Le propriétaire peut retirer n'importe qui, un membre peut se retirer lui-même
    if group.owner_id != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action non autorisée")
    
    member_result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
    )
    member = member_result.first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé dans ce groupe")
    
    await session.delete(member)
    
    # Notifier l'utilisateur retiré du groupe (seulement si c'est le propriétaire qui retire)
    if current_user.id != user_id:
        notification = Notification(
            user_id=user_id,
            type="group_removed",
            title=f"Retiré du groupe « {group.name} »",
            message=f"{current_user.username} vous a retiré du groupe « {group.name} »",
            icon="user-minus",
            color="#ef4444",
            link="/groups",
            target_type="group",
            target_id=group.id
        )
        session.add(notification)
    
    await session.commit()

@router.get("/{group_id}/check-user/{username}")
async def check_user_exists(
    group_id: int,
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Vérifier si un utilisateur existe (pour autocomplétion)"""
    user_result = await session.exec(
        select(User).where(User.username == username, User.deleted_at == None)
    )
    user = user_result.first()
    
    if not user:
        return {"exists": False, "username": username}
    
    # Vérifier si déjà membre
    member_result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id
        )
    )
    is_member = member_result.first() is not None
    
    return {
        "exists": True,
        "username": user.username,
        "is_already_member": is_member
    }
