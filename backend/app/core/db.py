from sqlmodel import SQLModel, create_engine
import os
from dotenv import load_dotenv

load_dotenv()

RAW_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://wisherr:wisherr@db:5432/wisherr")
# Force TOUJOURS le schéma sync pour l'engine sync
if RAW_DATABASE_URL.startswith("postgresql+asyncpg://"):
    SYNC_DATABASE_URL = RAW_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
elif RAW_DATABASE_URL.startswith("postgresql://"):
    SYNC_DATABASE_URL = RAW_DATABASE_URL
else:
    # fallback extrême
    SYNC_DATABASE_URL = "postgresql://wisherr:wisherr@db:5432/wisherr"

engine = create_engine(
    SYNC_DATABASE_URL,
    echo=True,
    future=True,
    pool_size=10,
    max_overflow=2,
    pool_recycle=1800,
)

def init_db():
    SQLModel.metadata.create_all(engine)
