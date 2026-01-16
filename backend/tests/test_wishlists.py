import pytest
from httpx import AsyncClient
from app.main import app


@pytest.fixture
async def auth_headers():
    """Fixture pour obtenir un token d'authentification"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Créer un utilisateur de test
        await client.post("/api/auth/register", json={
            "username": "wishlistuser",
            "email": "wishlist@example.com",
            "password": "TestPassword123!"
        })
        
        # Se connecter
        login_response = await client.post("/api/auth/login", json={
            "username": "wishlistuser",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_wishlist(auth_headers):
    """Test de création d'une wishlist"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/wishlists", 
            headers=await auth_headers,
            json={
                "title": "Ma liste de souhaits",
                "description": "Cadeaux pour mon anniversaire",
                "is_public": False
            })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Ma liste de souhaits"
        assert data["is_public"] is False


@pytest.mark.asyncio
async def test_list_wishlists(auth_headers):
    """Test de listage des wishlists avec pagination"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await auth_headers
        
        # Créer plusieurs wishlists
        for i in range(5):
            await client.post("/api/wishlists", 
                headers=headers,
                json={"title": f"Liste {i}", "is_public": False})
        
        # Lister avec pagination
        response = await client.get("/api/wishlists?skip=0&limit=3", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3


@pytest.mark.asyncio
async def test_get_wishlist_unauthorized():
    """Test d'accès à une wishlist privée sans autorisation"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/wishlists/999")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_wishlist(auth_headers):
    """Test de mise à jour d'une wishlist"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await auth_headers
        
        # Créer une wishlist
        create_response = await client.post("/api/wishlists", 
            headers=headers,
            json={"title": "Avant", "is_public": False})
        wishlist_id = create_response.json()["id"]
        
        # Mettre à jour
        response = await client.put(f"/api/wishlists/{wishlist_id}", 
            headers=headers,
            json={"title": "Après", "description": "Mis à jour"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Après"


@pytest.mark.asyncio
async def test_delete_wishlist(auth_headers):
    """Test de suppression d'une wishlist"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        headers = await auth_headers
        
        # Créer une wishlist
        create_response = await client.post("/api/wishlists", 
            headers=headers,
            json={"title": "À supprimer", "is_public": False})
        wishlist_id = create_response.json()["id"]
        
        # Supprimer
        response = await client.delete(f"/api/wishlists/{wishlist_id}", headers=headers)
        assert response.status_code == 200
        
        # Vérifier qu'elle n'existe plus
        get_response = await client.get(f"/api/wishlists/{wishlist_id}", headers=headers)
        assert get_response.status_code == 404
