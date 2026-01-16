import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_register_success():
    """Test d'inscription réussie avec un mot de passe valide"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "id" in data


@pytest.mark.asyncio
async def test_register_weak_password():
    """Test d'inscription avec mot de passe faible"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/auth/register", json={
            "username": "testuser2",
            "email": "test2@example.com",
            "password": "weak"
        })
        assert response.status_code == 400
        assert "mot de passe" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_username():
    """Test d'inscription avec un username déjà utilisé"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Première inscription
        await client.post("/api/auth/register", json={
            "username": "duplicate",
            "email": "duplicate1@example.com",
            "password": "TestPassword123!"
        })
        
        # Tentative de duplication
        response = await client.post("/api/auth/register", json={
            "username": "duplicate",
            "email": "duplicate2@example.com",
            "password": "TestPassword123!"
        })
        assert response.status_code == 400
        assert "déjà utilisé" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success():
    """Test de connexion réussie"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Inscription
        await client.post("/api/auth/register", json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "TestPassword123!"
        })
        
        # Connexion
        response = await client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials():
    """Test de connexion avec identifiants invalides"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        assert "invalides" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_current_user():
    """Test de récupération de l'utilisateur courant"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Inscription et connexion
        await client.post("/api/auth/register", json={
            "username": "meuser",
            "email": "me@example.com",
            "password": "TestPassword123!"
        })
        
        login_response = await client.post("/api/auth/login", json={
            "username": "meuser",
            "password": "TestPassword123!"
        })
        token = login_response.json()["access_token"]
        
        # Récupération du profil
        response = await client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "meuser"
        assert data["email"] == "me@example.com"
