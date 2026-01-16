from fastapi import APIRouter
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.async_db import async_engine
from app.models import SiteConfig
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

class SiteInfoResponse(BaseModel):
    site_title: str
    allow_registration: bool = True

async def get_async_session():
    async with AsyncSession(async_engine) as session:
        yield session

@router.get("/public/test")
def test_public():
	return {"ok": True, "service": "public"}

@router.get("/public/site-info", response_model=SiteInfoResponse)
async def get_site_info():
    """Récupérer les informations publiques du site (titre, etc.)"""
    async with AsyncSession(async_engine) as session:
        # Site title
        result = await session.exec(select(SiteConfig).where(SiteConfig.key == "site_title"))
        site_title_config = result.first()
        site_title = site_title_config.value if site_title_config else "Wisherr"
        
        # Allow registration
        reg_result = await session.exec(select(SiteConfig).where(SiteConfig.key == "allow_registration"))
        allow_reg_config = reg_result.first()
        allow_registration = allow_reg_config.value.lower() == "true" if allow_reg_config else True
        
        return SiteInfoResponse(
            site_title=site_title,
            allow_registration=allow_registration
        )

