# Fonctions utilitaires globales
import os
from typing import Optional
from sqlmodel import Session, select
from app.core.db import engine


def get_site_config(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Récupère une configuration du site depuis la DB.
    Si la config n'existe pas en DB, retourne la valeur par défaut.
    """
    try:
        from app.models import SiteConfig
        with Session(engine) as session:
            result = session.exec(select(SiteConfig).where(SiteConfig.key == key))
            config = result.first()
            if config:
                return config.value
            return default
    except Exception:
        # En cas d'erreur (DB non initialisée, etc.), retourner la valeur par défaut
        return default


def get_site_config_bool(key: str, default: bool = False) -> bool:
    """
    Récupère une configuration booléenne du site depuis la DB.
    """
    value = get_site_config(key, str(default).lower())
    if value is None:
        return default
    return value.lower() in ("true", "1", "yes", "on")

