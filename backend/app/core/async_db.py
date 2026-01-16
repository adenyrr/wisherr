from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv

load_dotenv()

RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://wisherr:wisherr@db:5432/wisherr")
# Force TOUJOURS le schéma asyncpg pour l'engine async
if RAW_DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = RAW_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif RAW_DATABASE_URL.startswith("postgresql+asyncpg://"):
    ASYNC_DATABASE_URL = RAW_DATABASE_URL
else:
    # fallback extrême
    ASYNC_DATABASE_URL = "postgresql+asyncpg://wisherr:wisherr@db:5432/wisherr"
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=True,
    future=True,
    connect_args={"timeout": 10},
)

def get_async_session():
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def session_scope():
        async with AsyncSession(async_engine) as session:
            yield session
    return session_scope
