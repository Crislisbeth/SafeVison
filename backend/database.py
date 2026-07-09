from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from config import DATABASE_URL
import logging

logger = logging.getLogger(__name__)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def connect_db():
    # En la mayoría de los casos de producción, alembic es mejor para migraciones.
    # Para desarrollo, create_all() es práctico.
    from models_db import User, Detection  # Para asegurar que los modelos están registrados en Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Connected to Database and tables ensured.")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        logger.error(f"Database connection error: {e}")
        raise e

async def close_db():
    await engine.dispose()
    print("[INFO] Database connection closed")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
