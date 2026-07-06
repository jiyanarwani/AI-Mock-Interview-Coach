import socket
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

def get_database_url() -> str:
    db_url = settings.database_url
    if db_url.startswith("postgresql"):
        try:
            # Parse host and port
            parts = db_url.split("@")
            if len(parts) > 1:
                host_port = parts[1].split("/")[0]
                host = "localhost"
                port = 5432
                if ":" in host_port:
                    host, port_str = host_port.split(":")
                    port = int(port_str)
                else:
                    host = host_port
                
                if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
                    # Check if port is open
                    with socket.create_connection((host, port), timeout=0.5):
                        pass
        except Exception:
            print("WARNING: PostgreSQL is not running on localhost. Falling back to local SQLite database (aiosqlite).")
            db_url = "sqlite+aiosqlite:///./interview_coach.db"
    return db_url

db_url = get_database_url()
engine = create_async_engine(db_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
