"""
Configuration des tests pytest
"""
import pytest
import asyncio
from typing import AsyncGenerator
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool
from app.core.db import engine as production_engine


# Override engine for tests with in-memory SQLite
@pytest.fixture(name="engine")
def engine_fixture():
    """Crée un engine de base de données en mémoire pour les tests"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="session")
def event_loop():
    """Crée une event loop pour les tests asynchrones"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
