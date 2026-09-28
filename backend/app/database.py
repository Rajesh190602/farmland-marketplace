from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import time
# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

engine = create_engine(
    DATABASE_URL,
    pool_size=15,
    max_overflow=0,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
def get_db():
    db = SessionLocal()
    session_start = time.perf_counter()

    try:
        yield db
    finally:
        session_lifetime_ms = (
            time.perf_counter() - session_start
        ) * 1000

        pool = engine.pool

        print(
            f"[DB SESSION PERF] "
            f"lifetime={session_lifetime_ms:.2f}ms "
            f"checked_out={pool.checkedout()} "
            f"overflow={pool.overflow()}"
        )

        db.close()

