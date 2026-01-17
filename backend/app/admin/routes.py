from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import os
import time
import asyncpg
import socket

from app.models import (
    User, Wishlist, Item, Group, WishlistShare, 
    SiteConfig, InternalError, AuditLog, Activity
)
from app.auth.deps import get_current_user
from app.auth.routes import get_password_hash
from app.core.async_db import async_engine

router = APIRouter(prefix="/admin", tags=["admin"])

# =====================================================
# SCHEMAS
# =====================================================

class ConfigUpdate(BaseModel):
    value: str

class ConfigResponse(BaseModel):
    id: int
    key: str
    value: Optional[str]
    value_type: str
    description: Optional[str]
    updated_at: datetime

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: datetime
    deleted_at: Optional[datetime]
    locale: Optional[str]
    lists_count: int = 0
    items_count: int = 0

class UserCreateRequest(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = False

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    locale: Optional[str] = None

class GlobalStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_wishlists: int
    total_items: int
    total_groups: int
    total_shares: int
    total_reservations: int
    active_users_7d: int
    new_users_30d: int
    items_per_wishlist_avg: float
    items_reserved: int
    items_purchased: int
    items_available: int

class ErrorResponse(BaseModel):
    id: int
    error_type: str
    message: str
    request_path: Optional[str]
    request_method: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

class LogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    target_type: str
    target_id: Optional[int]
    target_name: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

class ReportErrorRequest(BaseModel):
    error_type: str
    message: str
    request_path: Optional[str] = None
    stack_trace: Optional[str] = None

# =====================================================
# HELPERS
# =====================================================

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

async def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user

# =====================================================
# ROUTES - TEST
# =====================================================

@router.get("/test")
async def test_admin(admin: User = Depends(require_admin)):
    return {"ok": True, "service": "admin", "user": admin.username}

# =====================================================
# ROUTES - CONFIGURATION
# =====================================================

@router.get("/config", response_model=List[ConfigResponse])
async def list_config(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister toutes les configurations du site"""
    result = await session.exec(select(SiteConfig).order_by(SiteConfig.key))
    return result.all()

@router.get("/config/{key}", response_model=ConfigResponse)
async def get_config(
    key: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer une configuration"""
    result = await session.exec(select(SiteConfig).where(SiteConfig.key == key))
    config = result.first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    return config

@router.put("/config/{key}", response_model=ConfigResponse)
async def update_config(
    key: str,
    payload: ConfigUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier une configuration"""
    result = await session.exec(select(SiteConfig).where(SiteConfig.key == key))
    config = result.first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration non trouvée")
    
    config.value = payload.value
    config.updated_at = datetime.utcnow()
    config.updated_by = admin.id
    
    session.add(config)
    await session.commit()
    await session.refresh(config)
    
    # Log
    audit = AuditLog(
        user_id=admin.id,
        action="config_updated",
        target_type="config",
        target_id=config.id
    )
    session.add(audit)
    await session.commit()
    
    return config

class BulkConfigUpdate(BaseModel):
    configs: dict

@router.put("/config")
async def update_config_bulk(
    payload: BulkConfigUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier plusieurs configurations en une fois"""
    updated = []
    for key, value in payload.configs.items():
        result = await session.exec(select(SiteConfig).where(SiteConfig.key == key))
        config = result.first()
        if config:
            config.value = str(value)
            config.updated_at = datetime.utcnow()
            config.updated_by = admin.id
            session.add(config)
            updated.append(key)
    
    await session.commit()
    
    # Log
    audit = AuditLog(
        user_id=admin.id,
        action="config_updated",
        target_type="config",
        target_id=0
    )
    session.add(audit)
    await session.commit()
    
    return {"ok": True, "updated": updated}

# =====================================================
# ROUTES - MEMBRES
# =====================================================

@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_deleted: bool = False,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister tous les utilisateurs"""
    query = select(User)
    if not include_deleted:
        query = query.where(User.deleted_at == None)
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    
    result = await session.exec(query)
    users = result.all()
    
    responses = []
    for user in users:
        # Compter listes et articles
        lists_result = await session.exec(
            select(func.count()).select_from(Wishlist).where(Wishlist.owner_id == user.id)
        )
        lists_count = lists_result.first() or 0
        
        items_result = await session.exec(
            select(func.count()).select_from(Item)
            .join(Wishlist, Wishlist.id == Item.wishlist_id)
            .where(Wishlist.owner_id == user.id)
        )
        items_count = items_result.first() or 0
        
        responses.append(UserAdminResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_admin=user.is_admin,
            created_at=user.created_at,
            deleted_at=user.deleted_at,
            locale=user.locale,
            lists_count=lists_count,
            items_count=items_count
        ))
    
    return responses

@router.post("/users", response_model=UserAdminResponse)
async def create_user(
    payload: UserCreateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Créer un utilisateur (si OIDC désactivé)"""
    # Vérifier si OIDC activé
    oidc_result = await session.exec(select(SiteConfig).where(SiteConfig.key == "oidc_enabled"))
    oidc_config = oidc_result.first()
    if oidc_config and oidc_config.value == "true":
        raise HTTPException(
            status_code=400, 
            detail="Création manuelle désactivée (OIDC activé)"
        )
    
    # Vérifier unicité
    existing = await session.exec(
        select(User).where((User.username == payload.username) | (User.email == payload.email))
    )
    if existing.first():
        raise HTTPException(status_code=400, detail="Username ou email déjà utilisé")
    
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        is_admin=payload.is_admin
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Log
    audit = AuditLog(
        user_id=admin.id,
        action="user_created",
        target_type="user",
        target_id=user.id
    )
    session.add(audit)
    await session.commit()
    
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        created_at=user.created_at,
        deleted_at=user.deleted_at,
        locale=user.locale,
        lists_count=0,
        items_count=0
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    hard_delete: bool = False,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer un utilisateur (soft delete par défaut)"""
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer vous-même")
    
    if hard_delete:
        await session.delete(user)
    else:
        user.deleted_at = datetime.utcnow()
        session.add(user)
    
    # Log
    audit = AuditLog(
        user_id=admin.id,
        action="user_deleted" if hard_delete else "user_soft_deleted",
        target_type="user",
        target_id=user_id
    )
    session.add(audit)
    await session.commit()
    
    return {"ok": True, "hard_delete": hard_delete}

@router.put("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: int,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Activer/désactiver le statut admin d'un utilisateur"""
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut admin")
    
    user.is_admin = not user.is_admin
    session.add(user)
    await session.commit()
    
    return {"ok": True, "is_admin": user.is_admin}

@router.put("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Modifier un utilisateur (désactivé si OIDC actif)"""
    # Vérifier si OIDC activé
    oidc_result = await session.exec(select(SiteConfig).where(SiteConfig.key == "oidc_enabled"))
    oidc_config = oidc_result.first()
    if oidc_config and oidc_config.value == "true":
        raise HTTPException(
            status_code=400, 
            detail="Modification manuelle désactivée (OIDC activé)"
        )
    
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Appliquer les modifications
    if payload.username is not None:
        # Vérifier unicité
        existing = await session.exec(
            select(User).where(User.username == payload.username, User.id != user_id)
        )
        if existing.first():
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé")
        user.username = payload.username
    
    if payload.email is not None:
        existing = await session.exec(
            select(User).where(User.email == payload.email, User.id != user_id)
        )
        if existing.first():
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        user.email = payload.email
    
    if payload.password is not None and payload.password.strip():
        if len(payload.password) < 4:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 4 caractères")
        user.password_hash = get_password_hash(payload.password)
    
    if payload.is_admin is not None:
        if user.id == admin.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut admin")
        user.is_admin = payload.is_admin
    
    if payload.locale is not None:
        user.locale = payload.locale
    
    session.add(user)
    
    # Log
    audit = AuditLog(
        user_id=admin.id,
        action="user_updated",
        target_type="user",
        target_id=user_id
    )
    session.add(audit)
    await session.commit()
    await session.refresh(user)
    
    # Compter listes et articles
    lists_result = await session.exec(
        select(func.count()).select_from(Wishlist).where(Wishlist.owner_id == user.id)
    )
    lists_count = lists_result.first() or 0
    
    items_result = await session.exec(
        select(func.count()).select_from(Item)
        .join(Wishlist, Wishlist.id == Item.wishlist_id)
        .where(Wishlist.owner_id == user.id)
    )
    items_count = items_result.first() or 0
    
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        created_at=user.created_at,
        deleted_at=user.deleted_at,
        locale=user.locale,
        lists_count=lists_count,
        items_count=items_count
    )

# =====================================================
# ROUTES - STATISTIQUES
# =====================================================

@router.get("/stats", response_model=GlobalStatsResponse)
async def get_global_stats(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupérer les statistiques globales"""
    # Utilisateurs
    total_users_result = await session.exec(select(func.count()).select_from(User))
    total_users = total_users_result.first() or 0
    
    active_users_result = await session.exec(
        select(func.count()).select_from(User).where(User.deleted_at == None)
    )
    active_users = active_users_result.first() or 0
    
    # Listes
    total_lists_result = await session.exec(select(func.count()).select_from(Wishlist))
    total_lists = total_lists_result.first() or 0
    
    # Articles
    total_items_result = await session.exec(select(func.count()).select_from(Item))
    total_items = total_items_result.first() or 0
    
    # Moyenne items par liste
    items_per_wishlist_avg = round(total_items / total_lists, 2) if total_lists > 0 else 0.0
    
    reserved_result = await session.exec(
        select(func.count()).select_from(Item).where(Item.status == "reserved")
    )
    items_reserved = reserved_result.first() or 0
    
    purchased_result = await session.exec(
        select(func.count()).select_from(Item).where(Item.status == "purchased")
    )
    items_purchased = purchased_result.first() or 0
    
    available_result = await session.exec(
        select(func.count()).select_from(Item).where(Item.status == "available")
    )
    items_available = available_result.first() or 0
    
    # Réservations totales
    total_reservations = items_reserved + items_purchased
    
    # Utilisateurs actifs ces 7 derniers jours
    from datetime import timedelta
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_7d_result = await session.exec(
        select(func.count(func.distinct(Activity.user_id))).where(
            Activity.created_at >= seven_days_ago
        )
    )
    active_users_7d = active_7d_result.first() or 0
    
    # Nouveaux utilisateurs ces 30 derniers jours
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_result = await session.exec(
        select(func.count()).select_from(User).where(
            User.created_at >= thirty_days_ago
        )
    )
    new_users_30d = new_users_result.first() or 0
    
    # Groupes
    total_groups_result = await session.exec(select(func.count()).select_from(Group))
    total_groups = total_groups_result.first() or 0
    
    # Partages
    total_shares_result = await session.exec(select(func.count()).select_from(WishlistShare))
    total_shares = total_shares_result.first() or 0
    
    return GlobalStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_wishlists=total_lists,
        total_items=total_items,
        total_groups=total_groups,
        total_shares=total_shares,
        total_reservations=total_reservations,
        active_users_7d=active_users_7d,
        new_users_30d=new_users_30d,
        items_per_wishlist_avg=items_per_wishlist_avg,
        items_reserved=items_reserved,
        items_purchased=items_purchased,
        items_available=items_available
    )

@router.get("/health")
async def get_health_detailed(admin: User = Depends(require_admin)):
    """Récupérer le statut de santé détaillé (équivalent enrichi de /api/health)"""
    start_time = time.time()
    
    # DB check
    db_ok = False
    db_latency = None
    db_error = None
    try:
        raw_dsn = os.getenv("DATABASE_URL", "postgresql://wisherr:wisherr@db:5432/wisherr")
        for suffix in ("+asyncpg", "+psycopg2", "+psycopg"):
            raw_dsn = raw_dsn.replace(suffix, "")
        t0 = time.perf_counter()
        conn = await asyncpg.connect(raw_dsn)
        await conn.execute("SELECT 1")
        await conn.close()
        db_latency = round((time.perf_counter() - t0) * 1000, 2)
        db_ok = True
    except Exception as e:
        db_error = str(e)
    
    # Redis check
    cache_ok = None
    cache_latency = None
    cache_error = None
    redis_host = os.getenv("REDIS_HOST")
    if redis_host:
        try:
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            t0 = time.perf_counter()
            sock = socket.create_connection((redis_host, redis_port), timeout=1)
            cache_latency = round((time.perf_counter() - t0) * 1000, 2)
            sock.close()
            cache_ok = True
        except Exception as e:
            cache_ok = False
            cache_error = str(e)
    
    return {
        "status": "healthy" if db_ok else "degraded",
        "uptime_seconds": round(time.time() - float(os.getenv("START_TIME", time.time())), 2),
        "database": {
            "ok": db_ok,
            "latency_ms": db_latency,
            "error": db_error
        },
        "cache": {
            "configured": redis_host is not None,
            "ok": cache_ok,
            "latency_ms": cache_latency,
            "error": cache_error
        },
        "version": os.getenv("APP_VERSION", "0.1.0")
    }

# =====================================================
# ROUTES - ERREURS INTERNES
# =====================================================

@router.get("/errors", response_model=List[ErrorResponse])
async def list_errors(
    limit: int = Query(20, ge=1, le=100),
    include_resolved: bool = False,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister les erreurs internes"""
    query = select(InternalError)
    if not include_resolved:
        query = query.where(InternalError.resolved_at == None)
    query = query.order_by(InternalError.created_at.desc()).limit(limit)
    
    result = await session.exec(query)
    return result.all()

@router.post("/errors/{error_id}/resolve")
async def resolve_error(
    error_id: int,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Marquer une erreur comme résolue"""
    result = await session.exec(select(InternalError).where(InternalError.id == error_id))
    error = result.first()
    if not error:
        raise HTTPException(status_code=404, detail="Erreur non trouvée")
    
    error.resolved_at = datetime.utcnow()
    error.resolved_by = admin.id
    session.add(error)
    await session.commit()
    
    return {"ok": True}

@router.delete("/errors/{error_id}")
async def delete_error(
    error_id: int,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer une erreur"""
    result = await session.exec(select(InternalError).where(InternalError.id == error_id))
    error = result.first()
    if not error:
        raise HTTPException(status_code=404, detail="Erreur non trouvée")
    
    await session.delete(error)
    await session.commit()
    
    return {"ok": True}

@router.delete("/errors")
async def clear_all_errors(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer toutes les erreurs"""
    result = await session.exec(select(InternalError))
    errors = result.all()
    count = len(errors)
    
    for error in errors:
        await session.delete(error)
    
    await session.commit()
    
    return {"ok": True, "deleted": count}

# =====================================================
# ROUTES - SIGNALEMENT D'ERREURS (ACCESSIBLE AUX USERS)
# =====================================================

@router.post("/report-error")
async def report_error(
    payload: ReportErrorRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Signaler une erreur rencontrée par l'utilisateur"""
    error = InternalError(
        error_type=payload.error_type,
        message=payload.message,
        stack_trace=payload.stack_trace,
        request_path=payload.request_path,
        request_method="REPORT",
        user_id=current_user.id
    )
    session.add(error)
    await session.commit()
    
    return {"ok": True, "message": "Erreur signalée avec succès"}

# =====================================================
# ROUTES - LOGS
# =====================================================

@router.get("/logs", response_model=List[LogResponse])
async def list_logs(
    limit: int = Query(50, ge=1, le=200),
    action_filter: Optional[str] = None,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Lister les logs d'audit et activités utilisateurs"""
    import json
    responses = []
    
    def parse_extra_data(data):
        """Parse extra_data qui peut être un dict, une string JSON, ou None"""
        if data is None:
            return None
        if isinstance(data, dict):
            return data if data else None
        if isinstance(data, str):
            try:
                parsed = json.loads(data)
                return parsed if parsed else None
            except (json.JSONDecodeError, TypeError):
                return None
        return None
    
    # 1. Récupérer les activités utilisateurs (plus riches en infos)
    activity_query = (
        select(Activity, User.username)
        .join(User, User.id == Activity.user_id, isouter=True)
        .order_by(Activity.created_at.desc())
        .limit(limit)
    )
    
    activity_result = await session.exec(activity_query)
    activities = activity_result.all()
    
    for act, username in activities:
        responses.append(LogResponse(
            id=act.id,
            user_id=act.user_id,
            username=username,
            action=act.action_type,
            target_type=act.target_type,
            target_id=act.target_id,
            target_name=act.target_name,
            extra_data=parse_extra_data(act.extra_data),
            created_at=act.created_at
        ))
    
    # 2. Récupérer les audit logs (actions admin)
    audit_query = (
        select(AuditLog, User.username)
        .join(User, User.id == AuditLog.user_id, isouter=True)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    
    if action_filter:
        audit_query = audit_query.where(AuditLog.action == action_filter)
    
    audit_result = await session.exec(audit_query)
    audit_logs = audit_result.all()
    
    for log, username in audit_logs:
        responses.append(LogResponse(
            id=log.id + 1000000,  # Offset pour éviter collision d'ID
            user_id=log.user_id,
            username=username,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            target_name=None,
            extra_data=None,
            created_at=log.created_at
        ))
    
    # Trier par date décroissante et limiter
    responses.sort(key=lambda x: x.created_at, reverse=True)
    return responses[:limit]

@router.get("/logs/actions")
async def list_log_actions(admin: User = Depends(require_admin)):
    """Lister les types d'actions disponibles dans les logs"""
    return {
        "actions": [
            "config_updated",
            "user_created",
            "user_deleted",
            "user_soft_deleted",
            "user_admin_toggled"
        ]
    }

@router.delete("/logs")
async def clear_all_logs(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Supprimer tous les logs d'audit"""
    # Supprimer les audit logs
    audit_result = await session.exec(select(AuditLog))
    audit_logs = audit_result.all()
    audit_count = len(audit_logs)
    for log in audit_logs:
        await session.delete(log)
    
    await session.commit()
    
    return {"ok": True, "deleted_audit_logs": audit_count}


