from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from app.core.db import engine
from app.core.async_db import async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import User, BlacklistedToken, Activity
from .schemas import UserResponse, TokenResponse, RegisterResponse, OkResponse
from .deps import get_current_user, oauth2_scheme, get_current_user_async
from pydantic import BaseModel, EmailStr
from app.core.utils import get_site_config_bool
import re
import os
import logging
from .limits import limiter

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
	raise RuntimeError("❌ ERREUR CRITIQUE: SECRET_KEY n'est pas défini dans .env")
if len(SECRET_KEY) < 32:
	raise RuntimeError("❌ ERREUR CRITIQUE: SECRET_KEY doit faire au moins 32 caractères")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

def validate_password(password: str):
	if len(password) < 8:
		raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
	if not re.search(r'[A-Z]', password):
		raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
	if not re.search(r'[a-z]', password):
		raise ValueError("Le mot de passe doit contenir au moins une minuscule.")
	if not re.search(r'\d', password):
		raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
	if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
		raise ValueError("Le mot de passe doit contenir au moins un caractère spécial.")

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/test")
def test():
	return {"ok": True}

class RegisterRequest(BaseModel):
	username: str
	email: str
	password: str

class LoginRequest(BaseModel):
	username: str
	password: str

def get_session():
	with Session(engine) as session:
		yield session

async def get_async_session():
	async with AsyncSession(async_engine) as session:
		yield session

def verify_password(plain_password, hashed_password):
	return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
	return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
	to_encode = data.copy()
	expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
	to_encode.update({"exp": expire})
	return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register", response_model=RegisterResponse)
@limiter.limit("5/minute")
async def register(payload: RegisterRequest, request: Request, session: AsyncSession = Depends(get_async_session)):
	if not get_site_config_bool("enable_local_auth", True):
		raise HTTPException(status_code=403, detail="L'authentification locale est désactivée.")
	username = payload.username
	email = payload.email
	password = payload.password
	
	# Valider le mot de passe
	try:
		validate_password(password)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))
	
	result = await session.exec(select(User).where((User.username == username) | (User.email == email)))
	user = result.first()
	if user:
		logging.info("register: tentative doublon", extra={"extra": {"username": username, "email": email}})
		raise HTTPException(status_code=400, detail="Nom d'utilisateur ou email déjà utilisé.")
	hashed = get_password_hash(password)
	user = User(username=username, email=email, password_hash=hashed, is_admin=False)
	session.add(user)
	await session.commit()
	await session.refresh(user)
	logging.info("register: success", extra={"user_id": user.id, "extra": {"username": user.username, "email": user.email}})
	return RegisterResponse(id=user.id, username=user.username, email=user.email)

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(payload: LoginRequest, request: Request, session: AsyncSession = Depends(get_async_session)):
	if not get_site_config_bool("enable_local_auth", True):
		raise HTTPException(status_code=403, detail="L'authentification locale est désactivée.")
	username = payload.username
	password = payload.password
	result = await session.exec(select(User).where(User.username == username))
	user = result.first()
	if not user or not user.password_hash or not verify_password(password, user.password_hash):
		logging.warning("login: echec", extra={"extra": {"username": username}})
		# Logger l'échec de connexion dans Activity
		if user:
			user_id = user.id  # Stocker avant le commit pour éviter le lazy load
			failed_activity = Activity(
				user_id=user_id,
				action_type="login_failed",
				target_type="user",
				target_id=user_id,
				target_name=username,
				is_public=False
			)
			session.add(failed_activity)
			await session.commit()
		raise HTTPException(status_code=401, detail="Identifiants invalides.")
	
	# Stocker les valeurs avant le commit pour éviter le lazy load après expiration de la session
	user_id = user.id
	user_username = user.username
	
	# Logger l'activité de connexion
	activity = Activity(
		user_id=user_id,
		action_type="user_login",
		target_type="user",
		target_id=user_id,
		target_name=user_username,
		is_public=False
	)
	session.add(activity)
	await session.commit()
	
	access_token = create_access_token({"sub": str(user_id)})
	logging.info("login: success", extra={"user_id": user_id, "extra": {"username": user_username}})
	return TokenResponse(access_token=access_token, token_type="bearer")

@router.post("/logout", response_model=OkResponse)
def logout(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
	blacklisted = BlacklistedToken(token=token)
	session.add(blacklisted)
	session.commit()
	return OkResponse(ok=True)

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
	return UserResponse(id=current_user.id, username=current_user.username, email=current_user.email, is_admin=current_user.is_admin, locale=current_user.locale, theme=current_user.theme)

class ProfileUpdateRequest(BaseModel):
	username: Optional[str] = None
	email: Optional[str] = None
	current_password: Optional[str] = None
	new_password: Optional[str] = None
	locale: Optional[str] = None
	theme: Optional[str] = None

from typing import Optional

@router.put("/profile", response_model=UserResponse)
async def update_profile(
	payload: ProfileUpdateRequest,
	current_user: User = Depends(get_current_user_async),
	session: AsyncSession = Depends(get_async_session)
):
	"""Mettre à jour le profil utilisateur"""
	# Vérifier le mot de passe actuel si changement de mot de passe demandé
	if payload.new_password:
		if not payload.current_password:
			raise HTTPException(status_code=400, detail="Le mot de passe actuel est requis")
		if not current_user.password_hash or not verify_password(payload.current_password, current_user.password_hash):
			raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
		try:
			validate_password(payload.new_password)
		except ValueError as e:
			raise HTTPException(status_code=400, detail=str(e))
	
	# Vérifier unicité username/email
	if payload.username and payload.username != current_user.username:
		existing = await session.exec(select(User).where(User.username == payload.username))
		if existing.first():
			raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
	
	if payload.email and payload.email != current_user.email:
		existing = await session.exec(select(User).where(User.email == payload.email))
		if existing.first():
			raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
	
	# Mettre à jour
	if payload.username:
		current_user.username = payload.username
	if payload.email:
		current_user.email = payload.email
	if payload.new_password:
		current_user.password_hash = get_password_hash(payload.new_password)
	if payload.locale:
		current_user.locale = payload.locale
	if payload.theme:
		current_user.theme = payload.theme
	
	session.add(current_user)
	await session.commit()
	await session.refresh(current_user)
	
	return UserResponse(id=current_user.id, username=current_user.username, email=current_user.email, is_admin=current_user.is_admin, locale=current_user.locale, theme=current_user.theme)
