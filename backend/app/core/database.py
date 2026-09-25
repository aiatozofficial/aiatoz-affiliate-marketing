from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

class Base(DeclarativeBase):
    pass

def _get_database_url() -> str:
    url = settings.database_url
    # Fix Render/Railway postgres URL: use psycopg3 driver (postgresql+psycopg://) instead of psycopg2
    # Render provides DATABASE_URL as postgresql:// but requirements use psycopg[binary]
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url

_db_url = _get_database_url()
connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
engine_kwargs = {"pool_pre_ping": True}
if not _db_url.startswith("sqlite"):
    engine_kwargs.update(pool_size=10, max_overflow=20, pool_recycle=1800)
engine = create_engine(_db_url, connect_args=connect_args, **engine_kwargs)

if _db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
