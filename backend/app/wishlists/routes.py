from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session
from sqlalchemy import text
from datetime import datetime
from app.core.db import engine
from app.auth.deps import get_current_user
from app.models import User, Activity

router = APIRouter()


def log_activity_sync(session: Session, user_id: int, action_type: str, 
                      target_type: str, target_id: int, target_name: str,
                      wishlist_id: int = None, extra_data: dict = None):
    """Log une activité utilisateur (version synchrone)"""
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


class WishlistOut(BaseModel):
    id: int
    owner_id: int
    title: str
    description: Optional[str] = None
    occasion: Optional[str] = None
    item_count: int = 0
    created_at: Optional[str] = None
    role: Optional[str] = None


class CreateWishlistRequest(BaseModel):
    title: str
    description: Optional[str] = None
    occasion: Optional[str] = None


@router.get("/wishlists/test")
def test_wishlists():
    return {"ok": True, "service": "wishlists"}


@router.get("/wishlists/mine", response_model=List[WishlistOut])
def list_my_wishlists(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Lister les wishlists de l'utilisateur courant"""
    sql = """
    SELECT w.id, w.owner_id, w.title, w.description, w.occasion, w.created_at,
           (SELECT COUNT(*) FROM items i WHERE i.wishlist_id = w.id) as item_count
    FROM wishlists w
    WHERE w.owner_id = :uid
    ORDER BY w.created_at DESC
    LIMIT :limit OFFSET :skip
    """
    with Session(engine) as session:
        result = session.execute(text(sql), {"uid": current_user.id, "limit": limit, "skip": skip})
        rows = []
        for r in result.mappings().all():
            rows.append({
                "id": r["id"],
                "owner_id": r["owner_id"],
                "title": r["title"],
                "description": r.get("description"),
                "occasion": r.get("occasion"),
                "item_count": r.get("item_count", 0),
                "created_at": str(r["created_at"]) if r.get("created_at") else None,
                "role": "owner"
            })
    return rows


@router.get("/wishlists/with-roles", response_model=List[WishlistOut])
def list_with_roles(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(20, ge=1, le=100, description="Nombre maximum d'éléments à retourner"),
    current_user: User = Depends(get_current_user)
):
    # Return all wishlists and annotate role for the current_user (owner/editor/viewer)
    sql = """
    SELECT w.id, w.owner_id, w.title, w.description,
      CASE WHEN w.owner_id = :uid THEN 'owner' ELSE wc.role END AS role
    FROM wishlists w
    LEFT JOIN wishlist_collaborators wc ON wc.wishlist_id = w.id AND wc.user_id = :uid
    ORDER BY w.created_at DESC
    LIMIT :limit OFFSET :skip
    """
    with Session(engine) as session:
        result = session.execute(text(sql), {"uid": current_user.id, "limit": limit, "skip": skip})
        rows = [dict(r) for r in result.mappings().all()]
    return rows


@router.get("/wishlists/{id}", response_model=WishlistOut)
def get_wishlist(id: int, current_user: User = Depends(get_current_user)):
    """Récupérer une wishlist par ID avec vérification d'accès (owner, collaborator, partage interne)"""
    with Session(engine) as session:
        # Récupérer la wishlist
        wl = session.execute(text("""
            SELECT w.id, w.owner_id, w.title, w.description, w.occasion, w.created_at,
                   (SELECT COUNT(*) FROM items i WHERE i.wishlist_id = w.id) as item_count
            FROM wishlists w WHERE w.id = :id
        """), {"id": id}).mappings().first()
        
        if not wl:
            raise HTTPException(status_code=404, detail="Liste non trouvée")
        
        # Vérifier l'accès
        role = None
        
        # Owner ou admin
        if wl["owner_id"] == current_user.id or current_user.is_admin:
            role = "owner"
        
        # Collaborateur direct
        if not role:
            coll = session.execute(text("""
                SELECT role FROM wishlist_collaborators 
                WHERE wishlist_id = :wid AND user_id = :uid
            """), {"wid": id, "uid": current_user.id}).mappings().first()
            if coll:
                role = coll["role"]
        
        # Partage interne direct vers l'utilisateur
        if not role:
            share = session.execute(text("""
                SELECT permission FROM wishlist_shares 
                WHERE wishlist_id = :wid AND target_user_id = :uid 
                AND share_type = 'internal' AND is_active = true
            """), {"wid": id, "uid": current_user.id}).mappings().first()
            if share:
                role = share["permission"]
        
        # Partage via groupe
        if not role:
            group_share = session.execute(text("""
                SELECT ws.permission FROM wishlist_shares ws
                JOIN group_members gm ON gm.group_id = ws.target_group_id
                WHERE ws.wishlist_id = :wid AND gm.user_id = :uid
                AND ws.share_type = 'internal' AND ws.is_active = true
                LIMIT 1
            """), {"wid": id, "uid": current_user.id}).mappings().first()
            if group_share:
                role = group_share["permission"]
        
        if not role:
            raise HTTPException(status_code=403, detail="Accès non autorisé à cette liste")
        
        return {
            "id": wl["id"],
            "owner_id": wl["owner_id"],
            "title": wl["title"],
            "description": wl.get("description"),
            "occasion": wl.get("occasion"),
            "item_count": wl.get("item_count", 0),
            "created_at": str(wl["created_at"]) if wl.get("created_at") else None,
            "role": role
        }


@router.post("/wishlists", response_model=WishlistOut)
def create_wishlist(payload: CreateWishlistRequest, current_user: User = Depends(get_current_user)):
    sql = text("INSERT INTO wishlists (owner_id, title, description, occasion, is_public, is_archived) VALUES (:owner_id, :title, :description, :occasion, :is_public, :is_archived) RETURNING id, owner_id, title, description, occasion, created_at")
    with Session(engine) as session:
        result = session.execute(sql, {"owner_id": current_user.id, "title": payload.title, "description": payload.description, "occasion": payload.occasion, "is_public": False, "is_archived": False})
        session.commit()
        row = result.mappings().first()
        
        # Log l'activité
        log_activity_sync(session, current_user.id, "wishlist_created", "wishlist", row["id"], payload.title)
        session.commit()
        
        return {
            "id": row["id"], 
            "owner_id": row["owner_id"], 
            "title": row["title"], 
            "description": row.get("description"),
            "occasion": row.get("occasion"),
            "item_count": 0,
            "created_at": str(row["created_at"]) if row.get("created_at") else None,
            "role": "owner"
        }


@router.delete("/wishlists/{id}")
def delete_wishlist(id: int, current_user: User = Depends(get_current_user)):
    # Only owner or admin can delete
    with Session(engine) as session:
        row = session.execute(text("SELECT owner_id, title FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        owner_id = row["owner_id"]
        title = row["title"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("DELETE FROM wishlists WHERE id = :id"), {"id": id})
        
        # Log l'activité (avant commit pour avoir les données)
        log_activity_sync(session, current_user.id, "wishlist_deleted", "wishlist", id, title)
        session.commit()
    return {"ok": True}


@router.put("/wishlists/{id}", response_model=WishlistOut)
def update_wishlist(id: int, payload: CreateWishlistRequest, current_user: User = Depends(get_current_user)):
    # Only owner or editor or admin can update
    with Session(engine) as session:
        row = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        owner_id = row["owner_id"]
        # check collaborator role
        coll = session.execute(text("SELECT role FROM wishlist_collaborators WHERE wishlist_id = :id AND user_id = :uid"), {"id": id, "uid": current_user.id}).mappings().first()
        role = coll["role"] if coll else None
        if current_user.id != owner_id and not current_user.is_admin and role not in ("editor", "owner"):
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("UPDATE wishlists SET title = :title, description = :description, updated_at = NOW() WHERE id = :id"), {"id": id, "title": payload.title, "description": payload.description})
        
        # Log l'activité avant le commit
        log_activity_sync(session, current_user.id, "wishlist_updated", "wishlist", id, payload.title)
        session.commit()
        
        updated = session.execute(text("SELECT id, owner_id, title, description FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        return {"id": updated["id"], "owner_id": updated["owner_id"], "title": updated["title"], "description": updated.get("description"), "role": ("owner" if current_user.id == owner_id else role)}

# --- Collaborators & sharing endpoints ---
class AddCollaboratorRequest(BaseModel):
    username: str
    role: str


@router.get("/wishlists/{id}/collaborators")
def get_collaborators(id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        rows = session.execute(text("SELECT wc.id, wc.user_id, u.username, u.email, wc.role FROM wishlist_collaborators wc JOIN users u ON u.id = wc.user_id WHERE wc.wishlist_id = :id"), {"id": id}).mappings().all()
        return [dict(r) for r in rows]


@router.post("/wishlists/{id}/collaborators")
def add_collaborator(id: int, payload: AddCollaboratorRequest, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        user = session.execute(text("SELECT id, username, email FROM users WHERE username = :username"), {"username": payload.username}).mappings().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        session.execute(text("INSERT INTO wishlist_collaborators (wishlist_id, user_id, role) VALUES (:wid, :uid, :role) ON CONFLICT (wishlist_id, user_id) DO UPDATE SET role = EXCLUDED.role"), {"wid": id, "uid": user["id"], "role": payload.role})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "add_collaborator", "wid": id})
        session.commit()
        return {"ok": True}

@router.delete("/wishlists/{id}/collaborators/{collab_id}")
def remove_collaborator(id: int, collab_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("DELETE FROM wishlist_collaborators WHERE id = :cid AND wishlist_id = :wid"), {"cid": collab_id, "wid": id})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "remove_collaborator", "wid": id})
        session.commit()
        return {"ok": True}

@router.put("/wishlists/{id}/collaborators/{collab_id}")
def update_collaborator(id: int, collab_id: int, payload: AddCollaboratorRequest, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("UPDATE wishlist_collaborators SET role = :role WHERE id = :cid AND wishlist_id = :wid"), {"role": payload.role, "cid": collab_id, "wid": id})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "update_collaborator", "wid": id})
        session.commit()
        return {"ok": True}

@router.get("/wishlists/{id}/audit")
def get_audit(id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        rows = session.execute(text("SELECT id, user_id, action, created_at FROM audit_log WHERE target_type = 'wishlist' AND target_id = :id ORDER BY created_at DESC LIMIT 50"), {"id": id}).mappings().all()
        return [dict(r) for r in rows]


class TransferOwnerRequest(BaseModel):
    user_id: int


@router.put("/wishlists/{id}/transfer_owner")
def transfer_owner(id: int, payload: TransferOwnerRequest, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        # ensure target user exists
        u = session.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": payload.user_id}).mappings().first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        session.execute(text("UPDATE wishlists SET owner_id = :new_owner WHERE id = :id"), {"new_owner": payload.user_id, "id": id})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "transfer_owner", "wid": id})
        session.commit()
        return {"ok": True}

class SharePasswordRequest(BaseModel):
    password: str


@router.post("/wishlists/{id}/share/public")
def set_public(id: int, payload: dict, current_user: User = Depends(get_current_user)):
    is_public = bool(payload.get("is_public"))
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("UPDATE wishlists SET is_public = :is_public WHERE id = :id"), {"is_public": is_public, "id": id})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "set_public" if is_public else "unset_public", "wid": id})
        session.commit()
        return {"ok": True}

@router.post("/wishlists/{id}/share/password")
def set_share_password(id: int, payload: SharePasswordRequest, current_user: User = Depends(get_current_user)):
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
    hashed = pwd.hash(payload.password)
    with Session(engine) as session:
        wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": id}).mappings().first()
        if not wl:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        owner_id = wl["owner_id"]
        if current_user.id != owner_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        session.execute(text("UPDATE wishlists SET share_password_hash = :hash WHERE id = :id"), {"hash": hashed, "id": id})
        session.execute(text("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (:uid, :action, 'wishlist', :wid)"), {"uid": current_user.id, "action": "set_share_password", "wid": id})
        session.commit()
        return {"ok": True}


# --- Settings endpoints ---
class WishlistSettingsRequest(BaseModel):
    notify_owner_on_reservation: Optional[bool] = None


@router.get("/wishlists/{id}/settings")
def get_wishlist_settings(id: int, current_user: User = Depends(get_current_user)):
    """Récupérer les paramètres d'une wishlist"""
    with Session(engine) as session:
        row = session.execute(
            text("SELECT owner_id, notify_owner_on_reservation FROM wishlists WHERE id = :id"),
            {"id": id}
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        # Seul le propriétaire peut voir les paramètres
        if current_user.id != row["owner_id"] and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        return {
            "notify_owner_on_reservation": row.get("notify_owner_on_reservation", True)
        }


@router.put("/wishlists/{id}/settings")
def update_wishlist_settings(id: int, payload: WishlistSettingsRequest, current_user: User = Depends(get_current_user)):
    """Mettre à jour les paramètres d'une wishlist"""
    with Session(engine) as session:
        row = session.execute(
            text("SELECT owner_id FROM wishlists WHERE id = :id"),
            {"id": id}
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        # Seul le propriétaire peut modifier les paramètres
        if current_user.id != row["owner_id"] and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Forbidden")
        
        updates = []
        params = {"id": id}
        
        if payload.notify_owner_on_reservation is not None:
            updates.append("notify_owner_on_reservation = :notify")
            params["notify"] = payload.notify_owner_on_reservation
        
        if updates:
            sql = f"UPDATE wishlists SET {', '.join(updates)}, updated_at = NOW() WHERE id = :id"
            session.execute(text(sql), params)
            session.commit()
        
        return {"ok": True}
