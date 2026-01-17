from sqlmodel import SQLModel, Field, Relationship, Index
from sqlalchemy import JSON, Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json

# =====================================================
# UTILISATEURS
# =====================================================

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=64)
    email: str = Field(index=True, unique=True, max_length=255)
    password_hash: Optional[str] = None
    oidc_sub: Optional[str] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    locale: Optional[str] = "fr"
    theme: Optional[str] = "dark"

class BlacklistedToken(SQLModel, table=True):
    __tablename__ = "blacklisted_tokens"
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True)
    blacklisted_at: datetime = Field(default_factory=datetime.utcnow)

# =====================================================
# GROUPES ET MEMBRES
# =====================================================

class Group(SQLModel, table=True):
    __tablename__ = "groups"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=128)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="groups.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    added_at: datetime = Field(default_factory=datetime.utcnow)
    added_by: Optional[int] = Field(default=None, foreign_key="users.id")

# =====================================================
# LISTES DE SOUHAITS
# =====================================================

class Wishlist(SQLModel, table=True):
    __tablename__ = "wishlists"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=128)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_public: bool = False
    share_password_hash: Optional[str] = None
    occasion: Optional[str] = Field(default=None, max_length=64)
    event_date: Optional[date] = None
    is_archived: bool = False
    cover_color: str = Field(default="#6366f1", max_length=7)
    notify_owner_on_reservation: bool = Field(default=True)  # Toggle pour notifications réservation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WishlistCollaborator(SQLModel, table=True):
    __tablename__ = "wishlist_collaborators"
    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key="wishlists.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: str = Field(max_length=16)  # owner, editor, viewer
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

# =====================================================
# PARTAGES AVANCÉS
# =====================================================

class WishlistShare(SQLModel, table=True):
    __tablename__ = "wishlist_shares"
    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key="wishlists.id", index=True)
    share_type: str = Field(max_length=16)  # internal, external
    target_group_id: Optional[int] = Field(default=None, foreign_key="groups.id")
    target_user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    permission: str = Field(default="viewer", max_length=16)  # viewer, editor
    share_token: Optional[str] = Field(default=None, unique=True, max_length=64)
    share_password_hash: Optional[str] = None
    notify_on_reservation: bool = Field(default=False)  # Notifier le propriétaire des réservations
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = Field(default=None, foreign_key="users.id")
    expires_at: Optional[datetime] = None
    is_active: bool = True

# =====================================================
# CATÉGORIES ET PRIORITÉS
# =====================================================

class ItemCategory(SQLModel, table=True):
    __tablename__ = "item_categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=64)
    color: str = Field(default="#6366f1", max_length=7)
    icon: str = Field(default="tag", max_length=32)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ItemPriority(SQLModel, table=True):
    __tablename__ = "item_priorities"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=32)
    level: int
    color: str = Field(max_length=7)
    icon: Optional[str] = Field(default=None, max_length=32)

# =====================================================
# ARTICLES
# =====================================================

class Item(SQLModel, table=True):
    __tablename__ = "items"
    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key="wishlists.id", index=True)
    name: str = Field(max_length=128)
    url: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = Field(default=None, foreign_key="item_categories.id")
    priority_id: Optional[int] = Field(default=None, foreign_key="item_priorities.id")
    status: str = Field(default="available", max_length=16)  # available, reserved, purchased
    custom_attributes: Optional[Dict[str, Any]] = Field(default={}, sa_type=JSON)  # JSONB in DB
    sort_order: int = Field(default=0)
    reserved_by: Optional[int] = Field(default=None, foreign_key="users.id")
    reserved_by_name: Optional[str] = Field(default=None, max_length=128)
    reserved_at: Optional[datetime] = None
    purchased_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# =====================================================
# RÉSERVATIONS (legacy, remplacé par status sur Item)
# =====================================================

class Reservation(SQLModel, table=True):
    __tablename__ = "reservations"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="items.id", index=True)
    reserver_name: Optional[str] = Field(default=None, max_length=128)
    reserver_user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    reserved_at: datetime = Field(default_factory=datetime.utcnow)
    notify_giver: bool = False
    notify_owner: bool = True
    is_surprise: bool = True

# =====================================================
# ACTIVITÉS (FEED)
# =====================================================

class Activity(SQLModel, table=True):
    __tablename__ = "activities"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    action_type: str = Field(max_length=32)
    target_type: str = Field(max_length=32)
    target_id: Optional[int] = None
    target_name: Optional[str] = Field(default=None, max_length=256)
    extra_data: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB, nullable=True, default={}))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    wishlist_id: Optional[int] = Field(default=None, foreign_key="wishlists.id")
    is_public: bool = False

# =====================================================
# CONFIGURATION DU SITE (ADMIN)
# =====================================================

class SiteConfig(SQLModel, table=True):
    __tablename__ = "site_config"
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, max_length=64)
    value: Optional[str] = None
    value_type: str = Field(default="string", max_length=16)
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[int] = Field(default=None, foreign_key="users.id")

# =====================================================
# ERREURS INTERNES (ADMIN)
# =====================================================

class InternalError(SQLModel, table=True):
    __tablename__ = "internal_errors"
    id: Optional[int] = Field(default=None, primary_key=True)
    error_type: str = Field(max_length=64)
    message: str
    stack_trace: Optional[str] = None
    request_path: Optional[str] = Field(default=None, max_length=256)
    request_method: Optional[str] = Field(default=None, max_length=16)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = Field(default=None, foreign_key="users.id")

# =====================================================
# INVITATIONS (legacy)
# =====================================================

class Invitation(SQLModel, table=True):
    __tablename__ = "invitations"
    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key="wishlists.id", index=True)
    email: str = Field(max_length=255)
    invited_by: int = Field(foreign_key="users.id")
    token: str = Field(max_length=128)
    status: str = Field(max_length=16)  # pending, accepted, declined
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None

# =====================================================
# AUDIT LOG
# =====================================================

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    action: str = Field(max_length=64)
    target_type: str = Field(max_length=32)
    target_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# =====================================================
# NOTIFICATIONS
# =====================================================

class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: str = Field(max_length=32)  # item_added, item_reserved, item_purchased, group_added, list_shared, etc.
    title: str = Field(max_length=256)
    message: Optional[str] = None
    icon: str = Field(default="bell", max_length=32)
    color: str = Field(default="#6366f1", max_length=7)
    link: Optional[str] = Field(default=None, max_length=512)  # URL vers la ressource concernée
    target_type: Optional[str] = Field(default=None, max_length=32)  # wishlist, item, group
    target_id: Optional[int] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

