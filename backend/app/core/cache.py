"""
Module de cache Redis pour optimiser les performances
"""
import os
import json
import redis.asyncio as redis
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Configuration Redis
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # 1 heure par défaut

# Client Redis (None si Redis n'est pas configuré)
redis_client: Optional[redis.Redis] = None


async def init_redis():
    """Initialise la connexion Redis si configurée"""
    global redis_client
    if REDIS_HOST:
        try:
            redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            await redis_client.ping()
            logger.info(f"✅ Redis connecté sur {REDIS_HOST}:{REDIS_PORT}")
        except Exception as e:
            logger.warning(f"⚠️  Redis non disponible: {e}. Cache désactivé.")
            redis_client = None
    else:
        logger.info("ℹ️  Redis non configuré (REDIS_HOST manquant). Cache désactivé.")


async def close_redis():
    """Ferme la connexion Redis"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


async def get_cached(key: str) -> Optional[dict]:
    """
    Récupère une valeur depuis le cache Redis
    
    Args:
        key: Clé du cache
        
    Returns:
        dict ou None si non trouvé ou Redis indisponible
    """
    if not redis_client:
        return None
    
    try:
        cached = await redis_client.get(key)
        if cached:
            logger.debug(f"Cache HIT: {key}")
            return json.loads(cached)
        logger.debug(f"Cache MISS: {key}")
        return None
    except Exception as e:
        logger.warning(f"Erreur Redis GET {key}: {e}")
        return None


async def set_cached(key: str, value: dict, ttl: int = CACHE_TTL) -> bool:
    """
    Stocke une valeur dans le cache Redis
    
    Args:
        key: Clé du cache
        value: Valeur à stocker (sera sérialisée en JSON)
        ttl: Durée de vie en secondes (défaut: CACHE_TTL)
        
    Returns:
        True si succès, False sinon
    """
    if not redis_client:
        return False
    
    try:
        await redis_client.setex(key, ttl, json.dumps(value))
        logger.debug(f"Cache SET: {key} (TTL={ttl}s)")
        return True
    except Exception as e:
        logger.warning(f"Erreur Redis SET {key}: {e}")
        return False


async def delete_cached(key: str) -> bool:
    """
    Supprime une clé du cache
    
    Args:
        key: Clé à supprimer
        
    Returns:
        True si succès, False sinon
    """
    if not redis_client:
        return False
    
    try:
        await redis_client.delete(key)
        logger.debug(f"Cache DEL: {key}")
        return True
    except Exception as e:
        logger.warning(f"Erreur Redis DEL {key}: {e}")
        return False


async def invalidate_pattern(pattern: str) -> int:
    """
    Invalide toutes les clés matchant un pattern
    
    Args:
        pattern: Pattern Redis (ex: "wishlist:*")
        
    Returns:
        Nombre de clés supprimées
    """
    if not redis_client:
        return 0
    
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            deleted = await redis_client.delete(*keys)
            logger.debug(f"Cache INVALIDATE: {pattern} ({deleted} keys)")
            return deleted
        return 0
    except Exception as e:
        logger.warning(f"Erreur Redis INVALIDATE {pattern}: {e}")
        return 0
