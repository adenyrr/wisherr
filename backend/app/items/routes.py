from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session
from sqlalchemy import text
from app.core.db import engine
from app.auth.deps import get_current_user
from app.models import User

router = APIRouter()


class ItemOut(BaseModel):
	id: int
	wishlist_id: int
	name: str
	url: Optional[str] = None
	image_url: Optional[str] = None
	description: Optional[str] = None
	price: Optional[float] = None


class CreateItemRequest(BaseModel):
	wishlist_id: int
	name: str
	url: Optional[str] = None
	description: Optional[str] = None
	image_url: Optional[str] = None
	price: Optional[float] = None


class UpdateItemRequest(BaseModel):
	name: Optional[str]
	url: Optional[str]
	description: Optional[str]
	price: Optional[float]


@router.get("/items/test")
def test_items():
	return {"ok": True, "service": "items"}


@router.get("/items/wishlist/{wishlist_id}", response_model=List[ItemOut])
def list_items(wishlist_id: int, current_user: User = Depends(get_current_user)):
	sql = text("SELECT id, wishlist_id, name, url, image_url, description, price FROM items WHERE wishlist_id = :wid ORDER BY created_at DESC")
	with Session(engine) as session:
		rows = session.execute(sql, {"wid": wishlist_id}).mappings().all()
		return [dict(r) for r in rows]


@router.post("/items", response_model=ItemOut)
def create_item(payload: CreateItemRequest, current_user: User = Depends(get_current_user)):
	# ensure wishlist exists and user can add (owner/editor/admin)
	with Session(engine) as session:
		wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": payload.wishlist_id}).mappings().first()
		if not wl:
			raise HTTPException(status_code=404, detail="Wishlist not found")
		owner_id = wl["owner_id"]
		coll = session.execute(text("SELECT role FROM wishlist_collaborators WHERE wishlist_id = :id AND user_id = :uid"), {"id": payload.wishlist_id, "uid": current_user.id}).mappings().first()
		role = coll["role"] if coll else None
		if not (current_user.id == owner_id or current_user.is_admin or role == 'editor'):
			raise HTTPException(status_code=403, detail="Forbidden")
		ins = text("INSERT INTO items (wishlist_id, name, url, description, image_url, price) VALUES (:wid, :name, :url, :description, :image_url, :price) RETURNING id, wishlist_id, name, url, image_url, description, price")
		res = session.execute(ins, {"wid": payload.wishlist_id, "name": payload.name, "url": payload.url, "description": payload.description, "image_url": payload.image_url, "price": payload.price})
		session.commit()
		row = res.mappings().first()
		return dict(row)


@router.put("/items/{id}", response_model=ItemOut)
def update_item(id: int, payload: UpdateItemRequest, current_user: User = Depends(get_current_user)):
	with Session(engine) as session:
		row = session.execute(text("SELECT wishlist_id FROM items WHERE id = :id"), {"id": id}).mappings().first()
		if not row:
			raise HTTPException(status_code=404, detail="Item not found")
		wid = row["wishlist_id"]
		wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": wid}).mappings().first()
		owner_id = wl["owner_id"] if wl else None
		coll = session.execute(text("SELECT role FROM wishlist_collaborators WHERE wishlist_id = :id AND user_id = :uid"), {"id": wid, "uid": current_user.id}).mappings().first()
		role = coll["role"] if coll else None
		if not (current_user.id == owner_id or current_user.is_admin or role == 'editor'):
			raise HTTPException(status_code=403, detail="Forbidden")
		session.execute(text("UPDATE items SET name = COALESCE(:name, name), url = COALESCE(:url, url), description = COALESCE(:description, description), price = COALESCE(:price, price) WHERE id = :id"), {"id": id, "name": payload.name, "url": payload.url, "description": payload.description, "price": payload.price})
		session.commit()
		updated = session.execute(text("SELECT id, wishlist_id, name, url, image_url, description, price FROM items WHERE id = :id"), {"id": id}).mappings().first()
		return dict(updated)


@router.delete("/items/{id}")
def delete_item(id: int, current_user: User = Depends(get_current_user)):
	with Session(engine) as session:
		row = session.execute(text("SELECT wishlist_id FROM items WHERE id = :id"), {"id": id}).mappings().first()
		if not row:
			raise HTTPException(status_code=404, detail="Item not found")
		wid = row["wishlist_id"]
		wl = session.execute(text("SELECT owner_id FROM wishlists WHERE id = :id"), {"id": wid}).mappings().first()
		owner_id = wl["owner_id"] if wl else None
		coll = session.execute(text("SELECT role FROM wishlist_collaborators WHERE wishlist_id = :id AND user_id = :uid"), {"id": wid, "uid": current_user.id}).mappings().first()
		role = coll["role"] if coll else None
		if not (current_user.id == owner_id or current_user.is_admin or role == 'editor'):
			raise HTTPException(status_code=403, detail="Forbidden")
		session.execute(text("DELETE FROM items WHERE id = :id"), {"id": id})
		session.commit()
	return {"ok": True}

 # Additional routes can be added below
